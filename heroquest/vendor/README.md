# Three.js renderer

`three-0.186.1.js` is a local classic-script browser bundle of Three.js 0.186.1, exposed as `HQThree`. It is covered by the accompanying `THREE-LICENSE.txt` (MIT). There is no CDN or package-manager dependency at runtime.

Upstream package: <https://registry.npmjs.org/three/-/three-0.186.1.tgz>

Registry SHA-512 integrity:

```text
sha512-blFeqb49wRCSGUGj7gtpfnSGHy2lwDk94RhUmS1c/hTby70kvChbWpkJ4Pm1390LqzzvTmzgXKHPEafJwCb8jA==
```

The package integrity was checked before source preparation. Its `build/three.module.js` and `build/three.core.js` were bundled with esbuild 0.25.12 into one ordinary script. The upstream licence is preserved as a separate file. `three.cjs` in this release requires an ES module and is not a browser-compatible distribution.

To regenerate after downloading and extracting the official source files into the ignored `heroquest/tmp/three-source/` directory, run from the repository root:

```sh
npx --yes --package esbuild@0.25.12 esbuild heroquest/tmp/three-source/build/three.module.js --bundle --format=iife --global-name=HQThree --minify --legal-comments=inline --outfile=heroquest/vendor/three-0.186.1.js
```

This is renderer asset preparation for deliberate vendor updates, not an application build step. Ordinary edits to the game do not require it.
