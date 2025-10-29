# algebraic-effect

Provide a synchronous execution environment for asynchronous functions to eliminate async side effects.

# Install

```bash
npm install algebraic-effect
```

# Usage

## Simplest usage

```js
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
