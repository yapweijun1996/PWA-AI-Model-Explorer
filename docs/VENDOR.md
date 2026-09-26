# Local Chart.js build

Version: **Chart.js 4.5.1**. No runtime CDN is used.
The package includes a real, tree-shaken scatter-only build, not a replacement
chart implementation. It supports the three scatter-based views in this app.

`assets/vendor/chart.umd.min.js` is a historical filename. The bundled file is
an IIFE exposing `globalThis.Chart`. Unsupported unused chart controllers are
not included. Add a controller explicitly before introducing a bar/radar view.

## Reproduce the included build

In a separate build directory with network access:

```sh
npm install --ignore-scripts --no-audit --no-fund chart.js@4.5.1 esbuild@0.25.12
```

Create entry.js:

```js
import {
  Chart, ScatterController, LineElement, PointElement,
  LinearScale, LogarithmicScale, Tooltip
} from 'chart.js';
Chart.register(
  ScatterController, LineElement, PointElement,
  LinearScale, LogarithmicScale, Tooltip
);
globalThis.Chart = Chart;
```

```sh
./node_modules/.bin/esbuild entry.js --bundle --minify --format=iife   --target=es2022 --outfile=chart.scatter.min.js
```

Preserve Chart-LICENSE.md when copying the result into assets/vendor.

## Integrity checks

Included scatter build (153333 bytes), SHA-256:
`c811b6602c4777c754fe8fa6482d31222af4391333e9356041912df1f90824a8`

The build also accepts the fixed upstream full UMD fallback:
`48444a82d4edcb5bec0f1965faacdde18d9c17db3063d042abada2f705c9f54a`

License SHA-256:
`41a84aa2caba645f966a18d9c2056b73e6d3a81d80bc0046bc0011a2634d4cce`

The normal build uses the included files without downloading anything. If they
are absent, prepare-vendor.mjs can fetch the pinned upstream full build and
license; both must match their expected hashes. A failed verification stops the
build instead of silently executing an unknown dependency.

Sources:
- https://www.chartjs.org/docs/latest/getting-started/integration.html
- https://github.com/chartjs/Chart.js/releases/tag/v4.5.1
- https://github.com/chartjs/Chart.js/blob/v4.5.1/LICENSE.md
