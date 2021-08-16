# vite-plugin-inspect

[![NPM version](https://img.shields.io/npm/v/vite-plugin-inspect?color=a1b858&label=)](https://www.npmjs.com/package/vite-plugin-inspect)

Inspect the intermediate state of Vite plugins. Useful for debugging and authoring plugins.

<img width="1304" src="https://user-images.githubusercontent.com/11247099/129639115-07f9f087-8098-455d-b277-fb9449a31f6d.png">

## Install

```bash
npm i -D vite-plugin-inspect
```

Add plugin to your `vite.config.ts`:

```ts
// vite.config.ts
import Inspect from 'vite-plugin-inspect'

export default {
  plugins: [
    Inspect() // only applies in dev mode
  ]
}
```

Then visit [localhost:3000/__inspect](http://localhost:3000/__inspect) to inspect the modules.

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg'/>
  </a>
</p>

## License

[MIT](./LICENSE) License © 2021 [Anthony Fu](https://github.com/antfu)
