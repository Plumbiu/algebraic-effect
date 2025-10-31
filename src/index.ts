import { Fn } from './types'
import { isFunction } from './utils'

enum Status {
  Pending = 'pending',
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

interface Data<T> {
  status: Status[keyof Status]
  value: T | null
  name: string
  hasError?: boolean
}

// Fallback 相关类型
interface FallbackConfig<T extends Fn> {
  fn: T
  fallback: Awaited<ReturnType<T>> | T
}

type FallbackFunction<T extends Fn> =
  | T
  | [T, Awaited<ReturnType<T>>]
  | FallbackConfig<T>

function extractFallbackFunction<T extends Fn>(
  fallbackFn: FallbackFunction<T>,
) {
  if (Array.isArray(fallbackFn)) {
    return { fn: fallbackFn[0], fallback: fallbackFn[1] }
  }
  if (isFunction(fallbackFn)) {
    return { fn: fallbackFn }
  }
  return { fn: fallbackFn.fn, fallback: fallbackFn.fallback }
}

export function runSync<TBody extends Fn, TFns extends FallbackFunction<any>[]>(
  body: TBody,
  asyncFns: TFns,
): Promise<[ReturnType<TBody>, Data<any>[]]> {
  return new Promise((resolve, reject) => {
    const extractedFns = asyncFns.map(extractFallbackFunction)

    const data: Data<any>[] = extractedFns.map(({ fn }) => ({
      status: Status.Pending,
      value: null,
      name: fn.name,
    }))

    let processData: ReturnType<TBody> | null = null

    const syncFns = extractedFns.map(({ fn, fallback }, i) => {
      return (...args: any[]) => {
        const cache = data[i] as Data<any>
        if (cache.status === Status.Fulfilled) {
          return cache.value
        }
        if (cache.status === Status.Rejected) {
          throw cache.value
        }

        const promise = fn(...args)
          .then((value: any) => {
            cache.status = Status.Fulfilled
            cache.value = value
          })
          .catch((err: any) => {
            cache.hasError = true
            cache.status = Status.Fulfilled
            cache.value = isFunction(fallback) ? fallback(err) : fallback
          })

        throw promise
      }
    })

    const fn = new Function(
      ...extractedFns.map(({ fn }) => fn.name),
      `return (${body.toString()})()`,
    )

    const processEffect = async () => {
      try {
        processData = fn(...syncFns)
      } catch (error: any) {
        if (error instanceof Promise) {
          await error
          await processEffect()
        }
      }
    }

    processEffect()
      .then(() => {
        resolve([processData!, data])
      })
      .catch(reject)
  })
}
