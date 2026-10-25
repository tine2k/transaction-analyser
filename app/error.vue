<script setup lang="ts">
import type { NuxtError } from '#app';

// error.vue is not a route and is not wrapped in a layout automatically, so the
// layout is named here. It is the same one app.vue uses, which is what keeps a
// failure in the same frame as a successful page.
// See openspec/changes/add-nuxt-application-shell/specs/frontend-shell/spec.md
const props = defineProps<{ error: NuxtError }>();

// A missing path leaves the layout observing no screen, so the title is the application
// name; pinning it here keeps that true even when the router still holds the screen the
// failure was reached from.
useHead({ title: 'Expenses' });

const isMissing = computed(() => props.error.status === 404);
const heading = computed(() => (isMissing.value ? 'This page does not exist' : 'Something went wrong'));
const detail = computed(() =>
  isMissing.value
    ? 'The address may be mistyped, or the page may have moved. Use the navigation to reach any screen.'
    : 'The request could not be completed. Try again, or go back to the start.',
);
</script>

<template>
  <NuxtLayout name="default">
    <div>
      <p class="font-mono text-sm font-semibold text-muted">{{ error.status }}</p>
      <h1 class="mt-1 font-display text-2xl font-extrabold text-ink sm:text-3xl">{{ heading }}</h1>
      <p class="mt-2 max-w-2xl text-muted">{{ detail }}</p>
      <button
        type="button"
        class="mt-6 min-h-11 rounded-sheet bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        @click="clearError({ redirect: '/' })"
      >
        Back to the start
      </button>
    </div>
  </NuxtLayout>
</template>
