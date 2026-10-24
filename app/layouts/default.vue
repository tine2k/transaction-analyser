<script setup lang="ts">
// The one layout every route renders in. Beyond the shared document metadata and the
// page frame it now carries the menu bar through which the screens are reached: the
// transactions screen, the category management screen, the people management screen,
// the analysis screens, and the imports screen. The link for the screen currently
// shown is marked as the current one.
//
// See openspec/changes/add-category-management/specs/category-management-screen/spec.md
// and openspec/changes/add-people/specs/category-management-screen/spec.md
import {
  IconCalendarStats,
  IconChartHistogram,
  IconChartPie,
  IconDownload,
  IconList,
  IconMenu2,
  IconTags,
  IconUsers,
  IconX,
} from '@tabler/icons-vue';

const route = useRoute();
const mobileNavOpen = ref(false);

const screens = [
  { to: '/', label: 'Transactions', icon: IconList },
  { to: '/categories', label: 'Categories', icon: IconTags },
  { to: '/people', label: 'People', icon: IconUsers },
  { to: '/analytics', label: 'Analytics', icon: IconChartPie },
  { to: '/monthly-totals', label: 'Monthly totals', icon: IconCalendarStats },
  { to: '/monthly-average', label: 'Monthly average', icon: IconChartHistogram },
  { to: '/imports', label: 'Imports', icon: IconDownload },
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
    <header class="border-b border-rule-strong bg-surface">
      <div class="w-full px-4 py-4 sm:py-6">
        <div class="flex items-center justify-between gap-4">
          <p class="font-display text-xl font-semibold text-ink">
            Expenses
          </p>
          <button
            type="button"
            class="inline-flex size-11 items-center justify-center rounded-sheet border border-rule-strong bg-surface text-sm font-medium text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:hidden"
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
          class="mt-3 flex-col gap-1 text-sm sm:flex sm:flex-row sm:flex-wrap sm:gap-4"
          :class="mobileNavOpen ? 'flex' : 'hidden sm:flex'"
        >
          <NuxtLink
            v-for="screen in screens"
            :key="screen.to"
            :to="screen.to"
            :aria-current="isCurrent(screen.to) ? 'page' : undefined"
            class="inline-flex min-h-11 items-center gap-2 border-b-2 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:min-h-0"
            :class="
              isCurrent(screen.to)
                ? 'border-ink text-ink'
                : 'border-transparent text-muted hover:text-ink'
            "
            @click="mobileNavOpen = false"
          >
            <AppIcon :icon="screen.icon" />
            {{ screen.label }}
          </NuxtLink>
        </nav>
      </div>
    </header>

    <main class="w-full min-w-0 px-4 py-6 sm:py-10">
      <slot />
    </main>
  </div>
</template>
