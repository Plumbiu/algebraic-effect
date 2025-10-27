import { expect, test } from 'vitest'
import { runSync } from '../src'

test('basic', async () => {
  const asyncFn1 = async () => {
    return 1
  }

  const asyncFn2 = async () => {
    return 2
  }

  const main = () => {
    const data1 = asyncFn1() as unknown as number
    const data2 = asyncFn2() as unknown as number
    return data1 + data2
  }

  const data = await runSync(main, [asyncFn1, asyncFn2])
  expect(data).toEqual([
    3,
    [
      { status: 'fulfilled', value: 1, name: 'asyncFn1' },
      { status: 'fulfilled', value: 2, name: 'asyncFn2' },
    ],
  ])
})
