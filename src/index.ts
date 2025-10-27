const AsyncFunction = async function () {}.constructor

const isAsyncFunction = (fn: Function) => {
  return fn.constructor === AsyncFunction
}

const Status = {
  Pending: 'pending',
  Fulfilled: 'fulfilled',
  Rejected: 'rejected',
} as const

type StatusType = typeof Status
type Fn = (...args: any[]) => any

interface Data<T> {
  status: StatusType[keyof StatusType]
  value: T | null
  name: string
}

export function runSync<TBody extends Fn, TFns extends readonly Fn[]>(
  body: TBody,
  fns: TFns,
): Promise<
  [ReturnType<TBody>, { [K in keyof TFns]: Data<Awaited<ReturnType<TFns[K]>>> }]
> {
  return new Promise((resolve, reject) => {
    const data: Data<any>[] = fns.map((fn) => ({
      status: Status.Pending,
      value: null,
      name: fn.name,
    }))

    let processData: ReturnType<TBody> | null = null
    let pendingPromises: Promise<any>[] = []

    const syncFns = fns.map((fn, i) => {
      if (isAsyncFunction(fn)) {
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
              return value
            })
            .catch((err: any) => {
              cache.status = Status.Rejected
              cache.value = err
              throw err
            })

          pendingPromises.push(promise)
          throw promise
        }
      }
      return fn
    })

    const fn = new Function(
      ...fns.map((fn) => fn.name),
      `return (${body.toString()})()`,
    )

    const processEffect = async () => {
      try {
        processData = fn(...syncFns)
      } catch (error: any) {
        if (error instanceof Promise) {
          await Promise.allSettled(pendingPromises)
          pendingPromises = []
          await processEffect()
        }
      }
    }

    processEffect()
      .then(() => {
        const result = [processData as ReturnType<TBody>, data] as unknown as [
          ReturnType<TBody>,
          { [K in keyof TFns]: Data<Awaited<ReturnType<TFns[K]>>> },
        ]
        resolve(result)
      })
      .catch(reject)
  })
}
