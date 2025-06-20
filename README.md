# vite-plugin-inspect

[![NPM version](https://img.shields.io/npm/v/vite-plugin-inspect?color=a1b858&label=)](https://www.npmjs.com/package/vite-plugin-inspect)

Inspect the intermediate state of Vite plugins. Useful for debugging and authoring plugins.

<img width="1488" alt="Screenshot 2024-11-27 at 19 01 26" src="https://github.com/user-attachments/assets/ab6b86ac-d7ce-4424-a23f-02f265f547ea">

## Install

```bash
npm i -D vite-plugin-inspect
```

> [!NOTE]
>
> v10.x requires **Vite v6.0.1** or above.
>
> For Vite v2 to v5, use v0.8.x of `vite-plugin-inspect`. If you want to use it with both Vite 6 and below, you can still use v0.8.x, it's forwards compatible.

Add plugin to your `vite.config.ts`:

```ts
// vite.config.ts
import Inspect from 'vite-plugin-inspect'

export default {
  plugins: [
    Inspect()
  ],
}
```

Then run `npm run dev` and visit [localhost:5173/__inspect/](http://localhost:5173/__inspect/) to inspect the modules.

## Build Mode

To inspect transformation in build mode, you can pass the `build: true` option:

```ts
// vite.config.ts
import Inspect from 'vite-plugin-inspect'

export default {
  plugins: [
    Inspect({
      build: true,
      outputDir: '.vite-inspect'
    })
  ],
}
```

After running `vite build`, the inspector client will be generated under `.vite-inspect`, where you can use `npx serve .vite-inspect` to check the result.

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg'/>
  </a>
</p>

## License

[MIT](./LICENSE) License &copy; 2021-PRESENT [Anthony Fu](https://github.com/antfu)
