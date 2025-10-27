# algebraic-effect

Provide a synchronous execution environment for asynchronous functions to eliminate async side effects.

# Install

```bash
npm install algebraic-effect
```

# Usage

```js
const asyncFn1 = async () => {
  return 1
}

const asyncFn2 = async () => {
  return 2
}

const main = () => {
  const data1 = asyncFn1()
  const data2 = asyncFn2()
  return data1 + data2
}

const data = await runSync(main, [asyncFn1, asyncFn2])
console.log(data)
/*
[
  3,
  [
    { status: 'fulfilled', value: 1, name: 'asyncFn1' },
    { status: 'fulfilled', value: 2, name: 'asyncFn2' }
  ]
]
*/
```
