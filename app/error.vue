<script setup lang="ts">
import type { NuxtError } from '#app';

// error.vue is not a route and is not wrapped in a layout automatically, so the
// layout is named here. It is the same one app.vue uses, which is what keeps a
// failure in the same frame as a successful page.
// See openspec/changes/add-nuxt-application-shell/specs/frontend-shell/spec.md
const props = defineProps<{ error: NuxtError }>();

const isMissing = computed(() => props.error.status === 404);
const heading = computed(() => (isMissing.value ? 'This page does not exist' : 'Something went wrong'));
const detail = computed(() =>
  isMissing.value
    ? 'The application has one page so far, and this is not it.'
    : 'The request could not be completed.',
);
</script>

<template>
  <NuxtLayout name="default">
    <div>
      <p class="text-sm font-semibold text-slate-500">{{ error.status }}</p>
      <h1 class="mt-1 text-2xl font-bold text-slate-900">{{ heading }}</h1>
      <p class="mt-2 text-slate-600">{{ detail }}</p>
      <button
        type="button"
        class="mt-6 min-h-11 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
        @click="clearError({ redirect: '/' })"
      >
        Back to the start
      </button>
    </div>
  </NuxtLayout>
</template>
