#!/usr/bin/env node
// Renders public/icon.svg into the PNG assets the home screen, manifest, and browser
// use. The SVG is the source of truth; the PNGs are committed, and this script is not
// part of `nuxt build` or the container image, so neither needs a browser.
//
// The icon file is self-contained: it already carries the full-bleed gradient field and
// the mark at its final proportion, so every target is the same composition at a
// different pixel size. The maskable copy no longer needs its own scale because the
// mark sits well inside Android's safe zone.
//
// It drives the Chromium installed beside playwright-core, the same browser the
// browser tests use.
//
// See openspec/changes/replace-application-logo/design.md D3 and D4.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// The project installs its browsers inside node_modules (the test scripts set this
// too); a plain `node tools/render-app-icon.mjs` has to name it before Playwright
// resolves the executable.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= '0';

const { chromium } = await import('@playwright/test');

const root = new URL('..', import.meta.url);
const source = (await readFile(new URL('public/icon.svg', root), 'utf8'))
  // The XML declaration is not valid inside the HTML document the SVG is inlined in.
  .replace(/^<\?xml[^>]*\?>\s*/, '');

const targets = [
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-maskable-512.png', size: 512 },
];

const browser = await chromium.launch();
try {
  for (const { file, size } of targets) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });

    // An opaque backdrop keeps the touch icon's PNG colour type at 2 (no alpha);
    // the icon's full-bleed gradient covers it completely.
    await page.setContent(`<!doctype html>
      <html>
        <head>
          <style>
            html, body { margin: 0; background: #0F1B5C; }
            .field { width: ${size}px; height: ${size}px; }
            .field svg { display: block; width: 100%; height: 100%; }
          </style>
        </head>
        <body><div class="field">${source}</div></body>
      </html>`);

    await page.screenshot({ path: fileURLToPath(new URL(`public/${file}`, root)) });
    await page.close();

    console.log(`public/${file}  ${size}x${size}`);
  }
} finally {
  await browser.close();
}
