# vite-plugin-inspect

[![NPM version](https://img.shields.io/npm/v/vite-plugin-inspect?color=a1b858&label=)](https://www.npmjs.com/package/vite-plugin-inspect)

Inspect the intermediate state of Vite plugins. Useful for debugging and authoring plugins.

<img width="1488" alt="Screenshot 2024-11-27 at 19 01 26" src="https://github.com/user-attachments/assets/ab6b86ac-d7ce-4424-a23f-02f265f547ea">

## Install

> [!NOTE]
>
> v12.x requires **Vite v8.0.0** or above with **@vitejs/devtools v0.1.9** or above.
>
> For the previous versions, check the [v11](https://github.com/antfu-collective/vite-plugin-inspect/tree/v11) branch.

```bash
pnpm add -D vite-plugin-inspect @vitejs/devtools
```

Add plugin to your `vite.config.ts`:

```ts
// vite.config.ts
import Inspect from 'vite-plugin-inspect'

export default {
  devtools: true,
  plugins: [
    Inspect()
  ],
}
```

Then run `npm run dev` and open the DevTools to inspect the modules.

## Build Mode

To inspect transformation in build mode, you can set the `devtools.build.withApp` option to `true`:

```ts
// vite.config.ts
import Inspect from 'vite-plugin-inspect'

export default {
  devtools: {
    build: {
      withApp: true,
    }
  },
  plugins: [
    Inspect({
      build: true
    })
  ],
}
```

After running `vite build`, the inspector client will be generated under `.vite-inspect`, where you can use `npx serve .vite-inspect` to check the result.

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg' alt='Sponsors' />
  </a>
</p>

## License

[MIT](./LICENSE) License &copy; 2021-PRESENT [Anthony Fu](https://github.com/antfu)
