<script setup lang="ts">
// The one layout every route renders in. Beyond the shared document metadata and the
// page frame it now carries the menu bar through which the screens are reached: the
// transactions screen, the category management screen, the people management screen,
// the analysis screens, and the imports screen. The link for the screen currently
// shown is marked as the current one.
//
// The masthead's inner content and the main frame span the viewport at every width:
// padding, not a centered maximum-width column, keeps content off the edge. Screens
// that need a readable measure bound their own forms rather than the shared frame.
//
// See openspec/changes/add-category-management/specs/category-management-screen/spec.md
// and openspec/changes/add-people/specs/category-management-screen/spec.md
import { IconMenu2, IconX } from '@tabler/icons-vue';

const route = useRoute();
const mobileNavOpen = ref(false);

// The seven destinations keep their labels and order; the bar presents them as
// text-only pills, so a decorative icon is not carried per link.
const screens = [
  { to: '/', label: 'Transactions' },
  { to: '/categories', label: 'Categories' },
  { to: '/people', label: 'People' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/monthly-totals', label: 'Monthly totals' },
  { to: '/monthly-average', label: 'Monthly average' },
  { to: '/imports', label: 'Imports' },
] as const;

// The tab title takes the screen's name from the same list the menu is built from, so
// the two cannot drift: a route added to `screens` is named in the tab as well. A path
// no screen matches shows the application name alone.
// See openspec/changes/add-application-icon-and-name/design.md D5.
const screenLabel = computed(() => screens.find(({ to }) => to === route.path)?.label);

useHead({
  htmlAttrs: { lang: 'en' },
  title: computed(() => (screenLabel.value === undefined ? 'Expenses' : `${screenLabel.value} · Expenses`)),
  meta: [{ name: 'description', content: 'Reads transactions from a bank export.' }],
});

function isCurrent(to: string): boolean {
  return route.path === to;
}

watch(() => route.path, () => {
  mobileNavOpen.value = false;
});
</script>

<template>
  <div class="min-h-screen text-ink">
    <header class="brand-bar">
      <div class="px-4 pb-3 pt-3.5 sm:px-10 sm:py-3.5">
        <div class="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-start md:gap-8">
          <div class="flex items-center justify-between gap-4">
            <p class="font-display text-xl font-extrabold tracking-normal text-white md:tracking-[-0.02em]">
              Expenses
            </p>
            <button
              type="button"
              class="inline-flex size-11 items-center justify-center rounded-sheet border border-white/40 bg-white/10 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:hidden"
              data-testid="mobile-navigation-toggle"
              aria-controls="screen-navigation"
              :aria-expanded="mobileNavOpen"
              :aria-label="mobileNavOpen ? 'Close screen navigation' : 'Open screen navigation'"
              @click="mobileNavOpen = !mobileNavOpen"
            >
              <AppIcon :icon="mobileNavOpen ? IconX : IconMenu2" />
            </button>
          </div>
          <nav
            id="screen-navigation"
            aria-label="Screens"
            class="flex-col gap-1 md:flex md:flex-row md:flex-wrap md:items-center md:justify-start md:gap-1.5"
            :class="mobileNavOpen ? 'flex' : 'hidden md:flex'"
          >
            <NuxtLink
              v-for="screen in screens"
              :key="screen.to"
              :to="screen.to"
              :aria-current="isCurrent(screen.to) ? 'page' : undefined"
              class="inline-flex min-h-12 items-center rounded-control px-4 py-2 text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 md:min-h-10 md:rounded-pill md:py-2.5 md:text-sm"
              :class="
                isCurrent(screen.to)
                  ? 'bg-surface text-brand-bar-from focus-visible:outline-white'
                  : 'bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white'
              "
              @click="mobileNavOpen = false"
            >
              {{ screen.label }}
            </NuxtLink>
          </nav>
        </div>
      </div>
    </header>

    <main class="w-full min-w-0 px-4 py-5 pb-8 sm:px-10 sm:py-8 sm:pb-16">
      <slot />
    </main>
  </div>
</template>
