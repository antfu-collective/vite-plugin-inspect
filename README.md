# vite-plugin-inspect

[![NPM version](https://img.shields.io/npm/v/vite-plugin-inspect?color=a1b858&label=)](https://www.npmjs.com/package/vite-plugin-inspect)

Inspect the intermediate state of Vite plugins. Useful for debugging and authoring plugins.

<img width="1304" src="https://user-images.githubusercontent.com/46585162/134683677-487e3e03-fa6b-49ad-bde0-520ebb641a96.png">

![](https://s9.gifyu.com/images/Kapture-2021-09-11-at-07.33.36.gif)

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

Then visit [localhost:3000/__inspect/](http://localhost:3000/__inspect/) to inspect the modules.

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg'/>
  </a>
</p>

## License

[MIT](./LICENSE) License © 2021 [Anthony Fu](https://github.com/antfu)
