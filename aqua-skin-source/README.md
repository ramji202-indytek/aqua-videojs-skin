# AQUA — an aquarium skin for Video.js v10

The control strip is the glass of a small tank. Press play and the fish swim, bubbles rise and a few fish leap out
of the water; press pause and everything freezes exactly where it is. Built for the Video.js Skins Design Challenge
with `@videojs/html` 10.4 (HTML custom elements and plain CSS, no framework).

- `index.html`: the skin markup. Every control is a Video.js v10 component (`video-player`, `media-container`,
  `media-play-button`, `media-time-slider`, `media-volume-slider`, `media-menu`, ...).
- `src/slate.css`: the base layout. `src/aqua.css`: the AQUA look (water, glass controls, fish playhead, themes, logo).
- `src/aqua.js`: play/pause state for the animation, seek bubbles, themes, logo, toolbar toggles.
- `src/clock.js`, `src/meter.js`, `src/loader.js`: the water clock, the audio meter, and an optional "try your own video" panel.
- Public knobs (CSS variables): `--slate-ink`, `--slate-paper`, `--slate-accent`. Themes: Reef, Lagoon, Deep.

## Run

    npm install
    npm run dev        # http://localhost:5173/
    npm run build      # static site in dist/

## Deploy

    npx vercel --prod dist      # or: npx netlify deploy --prod --dir dist

## Video

The default video is a Mux asset (`data-demo-src` and the `<hls-video src>` in `index.html`, playback ID in `data-mux-id`).
If Mux cannot be reached the page falls back to the bundled demo clip in `public/`.

Demo video credit: B-Art.Studio (hosted on Mux).
Add `?tools=1` to the page URL to show the "Try your own video" panel (YouTube, direct links, local files).

## Accessibility

Frosted-glass controls with dark tint and bright text, 44px touch targets, 3px focus ring on every control,
full keyboard support (Space/K, arrows, M, F, C, T; Esc closes menus), reduced motion turns every animation off.

## Credits and license

Apache License 2.0 (see `LICENSE`). Built on [Video.js](https://videojs.org) (Apache-2.0). Font: Space Mono
(SIL Open Font License, via `@fontsource/space-mono`). All artwork, the fish, the reef and the demo clip are original.
