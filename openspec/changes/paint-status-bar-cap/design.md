# Design

## Context

See `proposal.md` for motivation and `specs/frontend-shell/spec.md` for the requirement.

The install metadata lives in `nuxt.config.ts` because the app disables SSR, so the document is delivered before the client boots. `apple-mobile-web-app-status-bar-style` is `default` after the archived `set-default-status-bar-style` change; that change accepted an opaque system-drawn band above the masthead. On iOS 27 the platform stopped honouring that value, so the band's appearance is now decided by what the page paints at the top edge.

`app/layouts/default.vue` is the one layout every route and the failure page render in. `.brand-bar` in `app/assets/css/main.css` paints the brand gradient and pads its content by `--safe-area-top` (a test seam) falling back to `env(safe-area-inset-top)`. With a 47px inset the gradient fills the status-bar area; that gradient is what iOS 27 blurs.

## Goals / Non-Goals

**Goals:**

- Give iOS 27 a fixed element at the top edge whose solid colour becomes the status bar's colour.
- Paint that band in the brand's start colour, matching the document and manifest theme colour.
- Leave the browser-tab and desktop rendering unchanged.

**Non-Goals:**

- Changing the masthead's gradient, content padding, or order.
- Changing the install metadata, the manifest, the theme colours, or the icons.
- Building a per-device status bar colour or reading the platform from script.
- Removing the blur inside an ordinary Safari tab; no page-level control exists for that.

## Decisions

**D1: A fixed cap in the shared layout, sampled by the platform.** Add a `div.status-cap` as the first child of the layout root and style it `position: fixed; top: 0; left: 0; right: 0` with a solid `background-color` of `--color-brand-bar-from` (`#101b5d`). It is above the header in paint order (`z-index: 40`), is `pointer-events: none`, and carries no content. Placing it in the layout covers every route and the failure page, which share the layout.

The platform's sampling rules (at least 6px high, at least 80% wide, within 4px of the top) are met by the viewport-width cap whenever a real top inset is present: every standalone iPhone reports a 20px or larger top inset with `viewport-fit=cover`.

**D2: Height driven by the top inset, not a fixed band.** `height: var(--safe-area-top, env(safe-area-inset-top, 0px))`. The cap is exactly the area the status bar occupies, so it replaces the blurred gradient edge rather than introducing a new visible strip below it. With no inset the height is zero and nothing is drawn: browser tabs, desktop windows, and platforms that keep the status bar outside the viewport keep their current rendering. A `6px` floor is deliberately not used, because it would paint a dark line across the top of every browser tab and desktop window.

**D3: The status bar shows the brand start colour while the masthead keeps its gradient.** iOS paints the sampled colour over the inset, so the visible band is the solid brand navy and the gradient remains in the bar below it. On the right-hand side the bar moves from the solid navy to the gradient's blue, the same transition Chromium platforms already show between their theme-coloured status bar and the gradient. The alternative — sampling a lighter colour — would either lose contrast for the white status-bar glyphs or misstate the bar's identity.

Alternative considered: make the whole masthead a solid colour so the band and the bar match exactly. Rejected: it removes the brand gradient everywhere and changes the application's identity far beyond the reported defect.

**D4: Keep the `default` status-bar metadata.** The archived `set-default-status-bar-style` change already delivers `default`, and the Reddit report ties the blur to `black-translucent`; the metadata is unchanged and the integration assertion stays. The cap is what makes the band match the theme on iOS 26 and 27, where the metadata has no effect.

**D5: Assert the cap in both states.** The component test asserts the cap is the layout's first element, is `aria-hidden`, and carries no text. The browser test with a simulated 47px top inset asserts the cap's computed position, width, height, and colour (`rgb(16, 27, 93)`), and the test without an inset asserts a zero height, so the no-inset rendering is proven rather than assumed.

## Risks / Trade-offs

- **The platform changes again** → The cap is additive: if iOS resumes honouring the metadata or samples something else, the cap degrades to a band of the existing theme colour and the rest of the frame is unchanged.
- **The blur region is taller than the status bar** → The cap is sized to the inset the platform reports; if the platform lays the blur lower, the cap still supplies the sampled colour and can be extended without touching the layout.
- **A sliver of gradient colour changes at the status-bar seam** → Accepted in D3; it matches the Chromium status bar's existing transition and keeps the gradient.
- **An installed shortcut may cache the old rendering** → Re-adding the home-screen shortcut is needed for metadata changes; this change alters page CSS, which the service-worker-free shell fetches on launch, so the cap applies on the next open.
- **The test seam is a custom property, not the device** → The browser test proves the delivered CSS contract; the platform's sampling itself is not observable in headless Chromium.
