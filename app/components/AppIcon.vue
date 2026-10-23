<script setup lang="ts">
// One icon, shown with the application's shared defaults: 16px, a stroke that
// matches interface type, no shrink inside a flex row, and no accessible name
// of its own — the surrounding label or aria-label names the control.
//
// It carries no artwork: the icon component is passed in from @tabler/icons-vue.
// See openspec/changes/add-tabler-icons/design.md D3.
import type { Component } from 'vue';

withDefaults(defineProps<{ icon: Component; size?: number }>(), { size: 16 });
</script>

<template>
  <span class="inline-flex shrink-0 items-center">
    <component :is="icon" :size="size" :stroke="1.5" aria-hidden="true" />
  </span>
</template>
