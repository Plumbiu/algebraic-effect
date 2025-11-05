import { Fn } from './types'
import { isFunction } from './utils'

enum Status {
  Pending = 'pending',
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

interface Data<T> {
  status: Status[keyof Status]
  value: T
  name: string
}

type FallbackFunction<TBody extends Fn, TBodyReturn = ReturnType<TBody>> =
  | TBody
  | [TBody, (err: any) => Awaited<TBodyReturn>]
  | {
      fn: TBody
      onError: (err: any) => Awaited<TBodyReturn>
    }

function extractFallbackFunction<TBody extends Fn>(
  onErrorFn: FallbackFunction<TBody>,
) {
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
  TAsyncBody extends Fn,
  TAsyncBodyReturnType = Awaited<ReturnType<TAsyncBody>>,
>(
  body: TBody,
  asyncFns: FallbackFunction<TAsyncBody>[],
): Promise<[ReturnType<TBody>, Data<TAsyncBodyReturnType | null>[]]> {
  return new Promise((resolve, reject) => {
    const extractedFns = asyncFns.map(extractFallbackFunction)

    const data: Data<TAsyncBodyReturnType | null>[] = extractedFns.map(
      ({ fn }) => ({
        status: Status.Pending,
        value: null,
        name: fn.name,
      }),
    )

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
            cache.value = isFunction(onError) ? onError(err) : err
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
