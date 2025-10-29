import { Fn } from './types'

export const isFunction = (x: unknown): x is Fn => typeof x === 'function'
