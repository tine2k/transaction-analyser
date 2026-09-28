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

const screens = [
  { to: '/', label: 'Transactions' },
  { to: '/categories', label: 'Categories' },
  { to: '/analytics', label: 'Analytics' },
] as const;

function isCurrent(to: string): boolean {
  return route.path === to;
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header class="border-b border-slate-200 bg-white">
      <div class="w-full px-4 py-6">
        <p class="text-xs font-semibold tracking-widest text-slate-500 uppercase">
          Transaction Analyser
        </p>
        <nav aria-label="Screens" class="mt-3 flex gap-4 text-sm">
          <NuxtLink
            v-for="screen in screens"
            :key="screen.to"
            :to="screen.to"
            :aria-current="isCurrent(screen.to) ? 'page' : undefined"
            class="font-medium"
            :class="
              isCurrent(screen.to)
                ? 'text-slate-900 underline underline-offset-4'
                : 'text-slate-500 hover:text-slate-700'
            "
          >
            {{ screen.label }}
          </NuxtLink>
        </nav>
      </div>
    </header>

    <main class="w-full px-4 py-10">
      <slot />
    </main>
  </div>
</template>
