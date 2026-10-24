#!/usr/bin/env node
// Renders public/icon.svg into the PNG assets the home screen, manifest, and browser
// use. The SVG is the source of truth; the PNGs are committed, and this script is not
// part of `nuxt build` or the container image, so neither needs a browser.
//
// It drives the Chromium installed beside playwright-core, the same browser the
// browser tests use.
//
// See openspec/changes/add-application-icon-and-name/design.md D3.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// The project installs its browsers inside node_modules (the test scripts set this
// too); a plain `node tools/render-app-icon.mjs` has to name it before Playwright
// resolves the executable.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= '0';

const { chromium } = await import('@playwright/test');

const root = new URL('..', import.meta.url);
const paper = '#f6f6f3';
const source = (await readFile(new URL('public/icon.svg', root), 'utf8'))
  // The XML declaration is not valid inside the HTML document the SVG is inlined in.
  .replace(/^<\?xml[^>]*\?>\s*/, '');

// `disc` is the disc's diameter as a fraction of the field. The drawn artwork holds
// the disc at 0.88; the maskable icon shrinks it so Android's 80%-wide mask cannot
// cut the arc.
const targets = [
  { file: 'apple-touch-icon.png', size: 180, disc: 0.88 },
  { file: 'icon-192.png', size: 192, disc: 0.88 },
  { file: 'icon-512.png', size: 512, disc: 0.88 },
  { file: 'icon-maskable-512.png', size: 512, disc: 0.72 },
];

const browser = await chromium.launch();
try {
  for (const { file, size, disc } of targets) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });

    await page.setContent(`<!doctype html>
      <html>
        <head>
          <style>
            html, body { margin: 0; background: ${paper}; }
            .field { width: ${size}px; height: ${size}px; }
            .field svg {
              display: block;
              width: 100%;
              height: 100%;
              transform: scale(${disc / 0.88});
              transform-origin: 50% 50%;
            }
          </style>
        </head>
        <body><div class="field">${source}</div></body>
      </html>`);

    await page.screenshot({ path: fileURLToPath(new URL(`public/${file}`, root)) });
    await page.close();

    console.log(`public/${file}  ${size}x${size}  disc ${Math.round(disc * 100)}%`);
  }
} finally {
  await browser.close();
}
