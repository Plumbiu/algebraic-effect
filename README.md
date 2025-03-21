# algebra-effect

Provide a synchronous execution environment for asynchronous functions to eliminate async side effects.

# Install

```bash
npm install algebra-effect
```

# Usage

```js
import { runSync } from 'algebra-effect'

const asyncFunction = async () => {
  return 1
}

const run = () => {
  const n = asyncFunction()
  console.log(n) // log 1, not Promise { 1 }
}

runSync(run, [asyncFunction])
// Get the data
const data = await runSync(run, [asyncFunction])
console.log(data)
/*
[{ status: 'fulfilled', value: 1 }]
*/
```
