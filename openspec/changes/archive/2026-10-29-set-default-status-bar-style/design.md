# Design

## Context

See `proposal.md` for motivation. The install metadata lives in the `app.head` block of `nuxt.config.ts` because the app disables SSR; the delivered shell must already carry it before the client boots. The current value, `black-translucent`, was chosen by `remove-mobile-top-white-band` so the `.brand-bar` gradient paints through the top safe area. That archived design explicitly rejected `default` because it leaves a separate status-bar band.

The safe-area layout reads `env(safe-area-inset-top)` through the `--safe-area-top` test seam in `app/assets/css/main.css`. In `default` mode iOS places the web content below its own status bar, so no top inset is expected and the brand bar's `padding-top` resolves to zero. The CSS path stays in place for any platform or launch mode that does report a top inset.

## Goals / Non-Goals

**Goals:**

- Deliver `apple-mobile-web-app-status-bar-style` as `default` in the document head.
- Keep the delivered document's other install metadata, the manifest, the theme colours, and the safe-area CSS unchanged.
- Keep the integration suite asserting the delivered value.

**Non-Goals:**

- Removing the brand bar's top safe-area padding or the `.brand-bar` gradient.
- Changing the theme colour, the manifest, or the icon set.
- Redesigning the header or compensating for the status-bar band with new padding.

## Decisions

### D1: Set the metadata value to `default`

Change the single `content` value to `default`. This supersedes D2 of `remove-mobile-top-white-band`, which rejected the default style; the accepted trade-off is that iOS draws its own opaque status-bar band above the brand bar instead of letting the gradient reach the screen's top edge.

Alternatives considered: keep `black-translucent` (the current behaviour, but not the requested one) and `black` (a dark band with light text, which is not the platform's standard appearance). `default` is the only value that satisfies the request.

### D2: Leave the theme colour and safe-area CSS alone

Keep the document `theme-color` and manifest `theme_color` at `#101B5D`, keep `viewport-fit=cover`, and keep the top safe-area padding on `.brand-bar`. On iOS the default status bar is platform-drawn and does not consume the theme colour; on Chromium platforms the dark theme colour still matches the brand bar. The CSS remains correct for any launch mode that reports a top inset and is a no-op when the inset is zero.

### D3: Update the explanatory comment with the value

The comment above the `app.head` block currently says the metadata makes the status bar translucent so the brand bar paints through the top safe area. That sentence would contradict the value, so it is rewritten to describe the default status bar and its separate band. No other comment needs to change: the stylesheet and layout comments describe how an inset is handled when one is present, which remains true.

### D4: Assert the literal metadata value

`tests/integration/api.test.ts` already extracts `metaContent('apple-mobile-web-app-status-bar-style')`. Change its expectation from `black-translucent` to `default`; no new helper or browser test is needed because the value is observable in the delivered document.

## Risks / Trade-offs

- **The pale status-bar band returns on iOS** → This is the requested outcome and follows from the platform's default style. The proposal records it; no CSS workaround is added.
- **Top safe-area painting becomes a no-op in the installed app on iOS** → The rule is retained for platforms that report an inset and for the existing simulated-inset browser test. The test still passes because it sets the custom property rather than relying on device behaviour.
- **Platforms diverge at the top edge** → iOS shows its own band; Chromium platforms use the dark theme colour. The brand bar itself is unchanged below the status area.
- **Installed shortcuts cache install metadata** → Re-adding the home-screen shortcut is needed before the new value applies, the same limitation noted by the earlier install change.
- **The integration test proves the value, not the visual result** → The status-bar appearance is platform-owned; the test asserts the delivered contract.

## Migration Plan

1. Change the metadata value and its comment in `nuxt.config.ts`.
2. Update the integration expectation.
3. Run the build and integration suite.
4. Re-add the iPhone home-screen shortcut to read the new value.
5. Rollback is a one-line revert of the metadata value; no data or manifest migration is involved.
