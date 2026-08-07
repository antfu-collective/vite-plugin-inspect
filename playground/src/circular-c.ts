// Example circular dependency for testing graph highlighting
export { a } from './circular-a'
export { b } from './circular-b'

export const c = 'circular-c'
