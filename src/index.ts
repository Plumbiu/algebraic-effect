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
}

// Fallback 相关类型
interface FallbackConfig<T extends Fn> {
  fn: T
  onError: Awaited<ReturnType<T>> | T
}

type FallbackFunction<T extends Fn> =
  | T
  | [T, Awaited<ReturnType<T>>]
  | FallbackConfig<T>

function extractFallbackFunction<T extends Fn>(onErrorFn: FallbackFunction<T>) {
  if (Array.isArray(onErrorFn)) {
    return { fn: onErrorFn[0], onError: onErrorFn[1] }
  }
  if (isFunction(onErrorFn)) {
    return { fn: onErrorFn }
  }
  return { fn: onErrorFn.fn, onError: onErrorFn.onError }
}

export function withSync<
  TBody extends Fn,
  TFns extends FallbackFunction<any>[],
>(body: TBody, asyncFns: TFns): Promise<[ReturnType<TBody>, Data<any>[]]> {
  return new Promise((resolve, reject) => {
    const extractedFns = asyncFns.map(extractFallbackFunction)

    const data: Data<any>[] = extractedFns.map(({ fn }) => ({
      status: Status.Pending,
      value: null,
      name: fn.name,
    }))

    let processData: ReturnType<TBody> | null = null

    const syncFns = extractedFns.map(({ fn, onError }, i) => {
      return (...args: any[]) => {
        const cache = data[i] as Data<any>
        if (
          cache.status === Status.Fulfilled ||
          cache.status === Status.Rejected
        ) {
          return cache.value
        }

        const promise = fn(...args)
          .then((value: any) => {
            cache.status = Status.Fulfilled
            cache.value = value
          })
          .catch((err: any) => {
            cache.status = Status.Rejected
            cache.value = isFunction(onError) ? onError(err) : onError
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
