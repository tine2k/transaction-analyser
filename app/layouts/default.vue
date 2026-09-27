<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'en' },
  title: 'Transaction Analyser',
  meta: [{ name: 'description', content: 'Reads transactions from a bank export.' }],
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto w-full max-w-5xl px-4 py-6">
        <p class="text-xs font-semibold tracking-widest text-slate-500 uppercase">
          Transaction Analyser
        </p>
      </div>
    </header>

    <main class="mx-auto w-full max-w-5xl px-4 py-10">
      <slot />
    </main>
  </div>
</template>
