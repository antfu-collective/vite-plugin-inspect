declare module 'virtual:hi' {
  const value: string
  export default value
}
declare module 'virtual:slow:*' {
  const value: string
  export default value
}
declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<any, any, any>
  export default component
}
