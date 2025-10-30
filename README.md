# algebraic-effect

Highly recommend reading [Algebraic Effects for the Rest of Us](https://overreacted.io/algebraic-effects-for-the-rest-of-us)

# Install

```bash
npm install algebraic-effect
```

# Usage

## Simplest usage

```js
import { runSync } from 'algebraic-effect'

const asyncFn1 = () => {
  return Promise.resolve(1)
}
const asyncFn2 = async () => {
  return 2
}
const main = () => {
  return asyncFn1() + asyncFn2()
}
const data = await runSync(main, [asyncFn1, asyncFn2])
expect(data).toEqual([
  3,
  [
    { status: 'fulfilled', value: 1, name: 'asyncFn1' },
    { status: 'fulfilled', value: 2, name: 'asyncFn2' },
  ],
])
```

## fallback usage

```ts
import { runSync } from 'algebraic-effect'

const asyncFn1 = async () => {
  throw new Error()
}
const asyncFn2 = async () => {
  return 2
}
const main = () => {
  return (asyncFn1() as unknown as number) + (asyncFn2() as unknown as number)
}
const data = await runSync(main, [
  // if asyncFn1 throw error, fallback is 1
  [asyncFn1, 1],
  { fn: asyncFn2, fallback: (err) => 2 },
])
expect(data).toEqual([
  3,
  [
    { status: 'fulfilled', value: 1, name: 'asyncFn1', hasError: true },
    { status: 'fulfilled', value: 2, name: 'asyncFn2' },
  ],
])
```

# Some error usages

You can examine the source code. I've constructed a new execution function using `new Function` and rebuilt the user-passed async function. However, some external variables are difficult to access through `new Function`, which has significant limitations. But in fact, if you understand the source code, you'll easily see that this is a compromise I made for user convenience. Any async function can overcome the limitations I mentioned by rewriting it according to the source code's approach."

1. First Parameter Must Be a Function Reference (Not a Function Call)
   ```ts
   runSync(() => main(), []) // ❎
   runSync(main, []) // ✅
   ```
2. Functions Cannot Access External Variables (Must Be Pure Functions)
   ```ts
   // ❎
   const a = 1
   const main = () => {
     return a
   }
   runSync(main, [])
   // ✅
   const main = () => {
     return 1
   }
   runSync(main, [])
   ```

# How it works?

Let's use a simple example to illustrate. Suppose you want to implement a synchronously executing `syncMain` function:

```ts
const asyncFn = async () => 1
const main = () => {
  const num = asyncFn()
  console.log(num)
}

const syncMain = () => {
  // TODO: implement
}
```

The key to implementation is: **throw the Promise result of asyncFn as an exception, then execute the main function twice**. The first execution throws an exception, and then we execute the main function again in the catch statement. Let's look at the code directly:

```ts
let asyncFn = async () => 1

let main = () => {
  const num = asyncFn()
  console.log(num)
}
const prevAsyncFn = asyncFn
const syncMain = () => {
  const data = {
    status: 'pending',
    value: null,
  }
  // Modify the asyncFn function so that when executed, it throws the promise of the final result
  asyncFn = () => {
    if (data.status === 'fulfilled') {
      return data.value
    }
    if (data.status === 'rejected') {
      throw data
    }
    // prevAsyncFn is an async function, so this is a promise
    const promise = prevAsyncFn()
      .then((res) => {
        data.status = 'fulfilled'
        data.value = res
      })
      .catch((err) => {
        data.status = 'rejected'
        data.value = err
      })
    // Throw this promise, which hasn't been resolved yet
    throw promise
  }

  try {
    // Since the asyncFn function will throw an exception, this will definitely enter the catch statement
    main()
  } catch (err) {
    if (err instanceof Promise) {
      // This way, after .then, the result is resolved
      err.then(main, main).finally(() => {
        // Don't forget to change asyncFn back
        asyncFn = prevAsyncFn
      })
    }
  }
}

syncMain()
```
