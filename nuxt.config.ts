import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  // Rendered in the browser, not on the server: Nuxt delivers the app shell and
  // the client builds the page. Still not a static export — a Nitro server
  // answers the API at run time and serves that shell.
  // See openspec/changes/disable-server-side-rendering/specs/frontend-shell/spec.md
  ssr: false,

  // Framework-maintenance pin, not a project decision.
  compatibilityDate: '2025-07-15',

  devtools: { enabled: true },

  // Bind the development server to the loopback address explicitly. Left to its
  // own device it binds whatever `localhost` resolves to first, which on this
  // machine is ::1 only, so a browser or a test reaching 127.0.0.1 is refused.
  // Naming the address makes the bind the same on every machine and keeps the
  // half-built application off the network.
  devServer: { host: '127.0.0.1' },

  // The home-screen identity. These belong here rather than in the layout's useHead:
  // with ssr disabled the layout runs only after the client application boots, and the
  // icon and manifest must already be in the document a browser is asked to install.
  // The manifest declares a standalone display, so an installed shortcut launches
  // without browser chrome; the iOS metadata repeats that launch mode and asks for
  // the platform's default status bar, which iOS draws as its own band above the
  // brand bar. The brand bar's top safe-area padding stays for launch modes that
  // report a top inset.
  // See openspec/changes/remove-mobile-top-white-band/design.md D1-D3 and
  // openspec/changes/set-default-status-bar-style/design.md D1-D3.
  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icon-192.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
      meta: [
        { name: 'apple-mobile-web-app-title', content: 'Expenses' },
        { name: 'theme-color', content: '#101B5D' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ],
    },
  },

  // The one stylesheet, loaded for every route including the failure page.
  // `~` resolves to app/ in Nuxt 4, so this is app/assets/css/main.css.
  css: ['~/assets/css/main.css'],

  // Tailwind 4 through its Vite plugin. No module, no tailwind.config.js:
  // version 4 detects the files to scan on its own.
  vite: {
    plugins: [tailwindcss()],
  },

  // The nightly Easybank sync is a Nitro task, scheduled in-process at 03:00 in
  // the container's time zone (TZ=Europe/Vienna). A night the server was not
  // running is recovered by the next run's window.
  //
  // See openspec/changes/add-easybank-sync/specs/easybank-sync/spec.md
  nitro: {
    experimental: { tasks: true },
    scheduledTasks: {
      '0 3 * * *': ['easybank:sync'],
    },

    // The startup migration plugin awaits its run at module scope, so the server
    // does not listen before migrations have been applied. Nitro's default esbuild
    // target refuses top-level await, and the fallback in design.md D6 would bind
    // the port before a failed start; instead the server code is built for the
    // Node version the project requires.
    // See openspec/changes/add-startup-database-migrations/design.md D6.
    esbuild: { options: { target: 'esnext' } },
  },
});
