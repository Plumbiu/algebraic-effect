import { expect, test } from 'vitest'
import { withSync } from '../src'

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

  const data = await withSync(main, [asyncFn1, asyncFn2])
  expect(data).toEqual([
    3,
    [
      { status: 'fulfilled', value: 1, name: 'asyncFn1' },
      { status: 'fulfilled', value: 2, name: 'asyncFn2' },
    ],
  ])
})

test('promise', async () => {
  const asyncFn1 = () => {
    return Promise.resolve(1)
  }

  const asyncFn2 = async () => {
    return 2
  }

  const main = () => {
    const data1 = asyncFn1() as unknown as number
    const data2 = asyncFn2() as unknown as number
    return data1 + data2
  }

  const data = await withSync(main, [asyncFn1, asyncFn2])
  expect(data).toEqual([
    3,
    [
      { status: 'fulfilled', value: 1, name: 'asyncFn1' },
      { status: 'fulfilled', value: 2, name: 'asyncFn2' },
    ],
  ])
})

test('arguments', async () => {
  const asyncFn1 = async () => {
    return 1
  }

  const asyncFn2 = async (n1: number, n2: number) => {
    return n1 + n2
  }

  const main = () => {
    const data1 = asyncFn1() as unknown as number
    const data2 = asyncFn2(data1, data1 * 2) as unknown as number
    return data1 + data2
  }

  const data = await withSync(main, [asyncFn1, asyncFn2])
  expect(data).toEqual([
    4,
    [
      { status: 'fulfilled', value: 1, name: 'asyncFn1' },
      { status: 'fulfilled', value: 3, name: 'asyncFn2' },
    ],
  ])
})

test('onError', async () => {
  const asyncFn1 = async () => {
    throw new Error()
  }

  const asyncFn2 = async () => {
    throw new Error()
  }

  const main = () => {
    return (asyncFn1() as unknown as number) + (asyncFn2() as unknown as number)
  }
  const data = await withSync(main, [
    [asyncFn1, 1],
    { fn: asyncFn2, onError: () => 2 },
  ])
  expect(data).toEqual([
    3,
    [
      { status: 'rejected', value: 1, name: 'asyncFn1' },
      { status: 'rejected', value: 2, name: 'asyncFn2' },
    ],
  ])
})
