import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  // Server-rendered, not a static export: a Nitro server answers at run time.
  // See openspec/changes/add-nuxt-application-shell/specs/backend-shell/spec.md
  ssr: true,

  // Framework-maintenance pin, not a project decision.
  compatibilityDate: '2025-07-15',

  devtools: { enabled: true },

  // Bind the development server to the loopback address explicitly. Left to its
  // own device it binds whatever `localhost` resolves to first, which on this
  // machine is ::1 only, so a browser or a test reaching 127.0.0.1 is refused.
  // Naming the address makes the bind the same on every machine and keeps the
  // half-built application off the network.
  devServer: { host: '127.0.0.1' },

  // The one stylesheet, loaded for every route including the failure page.
  // `~` resolves to app/ in Nuxt 4, so this is app/assets/css/main.css.
  css: ['~/assets/css/main.css'],

  // Tailwind 4 through its Vite plugin. No module, no tailwind.config.js:
  // version 4 detects the files to scan on its own.
  vite: {
    plugins: [tailwindcss()],
  },
});
