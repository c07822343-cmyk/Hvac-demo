# AERIS HVAC — cinematic local HVAC demo (Boca Raton, FL)

A fictional premium HVAC company website that combines the visual language of a
cinematic WebGL editorial experience with the clarity of a high-converting local
service site.

> **AERIS HVAC is not a real company.** Every name, phone number, email address,
> hour and image here is part of a design demonstration. No reviews, awards,
> credentials or statistics are invented anywhere on the site.

**Cinematic. Local. Simple. Convincing.**

---

## Run it

No build step. Any static file server works:

```bash
npm start                 # python3 -m http.server 8080
# or
python3 -m http.server 8080
# or: drop the folder on Cloudflare Pages / Netlify / GitHub Pages / Replit
```

Open `http://localhost:8080`. (ES modules + import maps need `http://`, so use a
server rather than double-clicking the file.)

## Tests / checks

```bash
npm test        # jsdom smoke test: fallback, reveals, menu, form, camera maths
npm run check   # every referenced asset, anchor and import resolves
npm run shaders # GLSL parse + vertex/fragment varying cross-check
```

## Architecture

Plain **HTML + CSS + JavaScript + Three.js** (vendored, no CDN, no build).

```
index.html                  all copy + the eight chapters
assets/
  css/
    fonts.css               self-hosted @font-face (OFL fonts)
    tokens.css              ← colors, type scale, spacing, motion: edit here
    base.css                reset, primitives, environment layer, grain
    layout.css              header, nav, chapter rail, section shells, footer
    components.css          buttons, plates, service rows, flow, form
    sections.css            per-chapter composition + non-WebGL image layer
    motion.css              reveals, word masks, reduced-motion behaviour
  js/
    config.js               ← camera keys, light keys, quality tiers: edit here
    main.js                 boot, nav, reveals, form, progressive enhancement
    scene/
      scene.js              renderer, tiers, watchdog, environment sampling
      camera.js             scroll-driven camera rig (chapter → keyframe)
      world.js              the property: house, pool, palms, HVAC, airflow
      post.js               bright-pass → blur → ACES/bloom/vignette/grain
      textures.js           procedural canvas textures (zero image payload)
  vendor/three.module.min.js   three r169, local copy
  fonts/                    woff2 + licenses
  img/                      webp chapter imagery (also the no-WebGL fallback)
  svg/                      frond / palmetto / grille / brand mark
tools/                      check.mjs, smoke.mjs, shaders.mjs
```

## Editing guide

| Want to change…      | Where |
| -------------------- | ----- |
| Headlines, services, contact details, demo notice | `index.html` |
| Colors, fonts, spacing, motion curves | `assets/css/tokens.css` |
| Camera path & time-of-day per chapter | `assets/js/config.js` (`keys`, `light`) |
| Quality tiers / FPS watchdog floor | `assets/js/config.js` (`tiers`, `fpsFloor`) |
| Chapter imagery | `assets/img/*.webp` + `data-bg` attributes in `index.html` |
| 3D geometry & materials | `assets/js/scene/world.js` |

## Progressive enhancement

The page is a complete, attractive website with **no WebGL at all**:

1. Boot shows a static cinematic poster (`assets/img/arrival.webp`).
2. WebGL is feature-detected; the 3D engine is imported *dynamically* only then.
3. A frame-rate watchdog steps quality down (pixel ratio → shadows → bloom)
   and, if the device still struggles, disposes the renderer and hands over to
   the per-chapter image layer (`body.webgl-off`).
4. Context loss, module errors, old browsers, disabled WebGL → same fallback.
5. `prefers-reduced-motion` freezes ambient motion (water, fan, grain, drift)
   while scroll-driven camera and content stay fully usable.

Nothing critical — navigation, services, contact, CTAs — depends on 3D, JS
animation or hover.

## Accessibility & performance

Semantic landmarks, single `h1`, labelled form fields, visible focus rings,
skip link, keyboard-complete navigation, `aria-live` form status, meaningful
alt text, reduced-motion support, no scroll trapping, no horizontal overflow at
390 × 844. Payload: ~900 KB of WebP imagery, ~690 KB vendored three.js,
~170 KB of woff2 — no external requests, no analytics, no paid APIs.

## Licenses

- Three.js — MIT (`assets/vendor/LICENSE-three.txt`)
- Bodoni Moda, Archivo, JetBrains Mono — SIL OFL (`assets/fonts/LICENSE-*.txt`)
- Imagery generated for this fictional demonstration.
