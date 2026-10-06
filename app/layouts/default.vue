<script setup lang="ts">
// The one layout every route renders in. Beyond the shared document metadata and the
// page frame it now carries the menu bar through which the screens are reached: the
// transactions screen and the category management screen. The link for the screen
// currently shown is marked as the current one.
//
// See openspec/changes/add-category-management/specs/category-management-screen/spec.md
// and openspec/changes/add-category-management/specs/frontend-shell/spec.md
useHead({
  htmlAttrs: { lang: 'en' },
  title: 'Transaction Analyser',
  meta: [{ name: 'description', content: 'Reads transactions from a bank export.' }],
});

const route = useRoute();
const mobileNavOpen = ref(false);

const screens = [
  { to: '/', label: 'Transactions' },
  { to: '/categories', label: 'Categories' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/monthly-totals', label: 'Monthly totals' },
  { to: '/monthly-average', label: 'Monthly average' },
] as const;

function isCurrent(to: string): boolean {
  return route.path === to;
}

watch(() => route.path, () => {
  mobileNavOpen.value = false;
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header class="border-b border-slate-200 bg-white">
      <div class="w-full px-4 py-4 sm:py-6">
        <div class="flex items-center justify-between gap-4">
          <p class="text-xs font-semibold tracking-widest text-slate-500 uppercase">
            Transaction Analyser
          </p>
          <button
            type="button"
            class="inline-flex size-11 items-center justify-center rounded-md border border-slate-300 text-sm font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 sm:hidden"
            data-testid="mobile-navigation-toggle"
            aria-controls="screen-navigation"
            :aria-expanded="mobileNavOpen"
            :aria-label="mobileNavOpen ? 'Close screen navigation' : 'Open screen navigation'"
            @click="mobileNavOpen = !mobileNavOpen"
          >
            <span aria-hidden="true">{{ mobileNavOpen ? 'Close' : 'Menu' }}</span>
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
            class="inline-flex min-h-11 items-center rounded py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 sm:min-h-0"
            :class="
              isCurrent(screen.to)
                ? 'text-slate-900 underline underline-offset-4'
                : 'text-slate-500 hover:text-slate-700'
            "
            @click="mobileNavOpen = false"
          >
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
