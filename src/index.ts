enum Status {
  Pending = 'pending',
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}

type StatusType = Status
type Fn = (...args: any[]) => any

interface Data<T> {
  status: StatusType[keyof StatusType]
  value: T | null
  name: string
}

export function runSync<TBody extends Fn, TFns extends Fn[]>(
  body: TBody,
  asyncFns: TFns,
): Promise<
  [ReturnType<TBody>, { [K in keyof TFns]: Data<Awaited<ReturnType<TFns[K]>>> }]
> {
  return new Promise((resolve, reject) => {
    const data: Data<any>[] = asyncFns.map((fn) => ({
      status: Status.Pending,
      value: null,
      name: fn.name,
    }))

    let processData: ReturnType<TBody> | null = null
    let pendingPromise: Promise<any> | null = null

    const syncFns = asyncFns.map((fn, i) => {
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

        pendingPromise = promise
        throw promise
      }
    })

    const fn = new Function(
      ...asyncFns.map((fn) => fn.name),
      `return (${body.toString()})()`,
    )

    const processEffect = async () => {
      try {
        processData = fn(...syncFns)
      } catch (error: any) {
        if (error instanceof Promise) {
          await pendingPromise
          pendingPromise = null
          await processEffect()
        } else {
          reject(error)
        }
      }
    }

    processEffect()
      .then(() => {
        resolve([
          processData!,
          data as { [K in keyof TFns]: Data<Awaited<ReturnType<TFns[K]>>> },
        ])
      })
      .catch(reject)
  })
}
