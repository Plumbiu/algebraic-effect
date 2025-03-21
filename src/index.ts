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
}

export function runSync<T extends Fn>(
  body: Fn,
  fns: T[],
): Promise<Data<Awaited<ReturnType<T>>>[]> {
  return new Promise((resolve, reject) => {
    const data: Data<any>[] = fns.map(() => ({
      status: Status.Pending,
      value: null,
    }))
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
            })
            .catch((err: any) => {
              cache.status = Status.Rejected
              cache.value = err
            })
          throw promise
        }
      }
      return fn
    })
    const fn = new Function(
      ...fns.map((fn) => fn.name),
      `(${body.toString()})()`,
    )
    const processEffect = () => fn(...syncFns)
    try {
      processEffect()
    } catch (error: any) {
      error.then(processEffect, processEffect)
    } finally {
      resolve(data)
    }
  })
}
