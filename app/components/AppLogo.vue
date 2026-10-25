<script setup lang="ts">
// The application's logo mark: four wedges cut by four radial seams, drawn on a
// 32-unit grid. The seams are masked out rather than painted, so they show the
// surface behind the mark — the brand bar in the masthead, the gradient tile in
// the icon. The mark is decorative; the surrounding wordmark names it.
//
// See openspec/changes/replace-application-logo/design.md D1 and D2.
withDefaults(defineProps<{ size?: number }>(), { size: 30 });
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    data-testid="application-logo"
    class="shrink-0"
  >
    <defs>
      <mask id="logo-mark-seams">
        <rect width="32" height="32" fill="#fff" />
        <g stroke="#000" stroke-width="1.8">
          <path d="M16 16L16.00 -6.00" />
          <path d="M16 16L27.00 35.05" />
          <path d="M16 16L-2.02 28.62" />
          <path d="M16 16L-2.02 3.38" />
        </g>
      </mask>
    </defs>
    <g mask="url(#logo-mark-seams)">
      <path d="M16 16L16.00 2.00A14 14 0 0 1 23.00 28.12Z" fill="#FF8A3D" />
      <path d="M16 16L23.00 28.12A14 14 0 0 1 4.53 24.03Z" fill="#9B7BFF" />
      <path d="M16 16L4.53 24.03A14 14 0 0 1 4.53 7.97Z" fill="#2DD4BF" />
      <path transform="translate(-0.74 -1.42)" d="M16 16L4.53 7.97A14 14 0 0 1 16.00 2.00Z" fill="#FF5FA8" />
    </g>
  </svg>
</template>
