<script setup lang="ts">
// The fixed bar through which a row selection becomes a bulk manual assignment.
// It is presentational: it shows how many transactions are selected and offers
// the stored categories — each hidden one marked — and an Uncategorised choice.
// It emits the chosen assignment or a request to clear the selection, performs
// no request of its own, creates no category, and decides no assignment.
//
// Applying is an explicit action rather than a change of the category control,
// because a bulk misfire affects every selected transaction at once.
//
// See openspec/changes/add-manual-category-assignment/specs/manual-category-assignment/spec.md
import { IconCheck, IconX } from '@tabler/icons-vue';

type BarCategory = { id: string; name: string; hidden: boolean };

const props = defineProps<{
  count: number;
  categories: ReadonlyArray<BarCategory>;
  disabled?: boolean;
}>();

const emit = defineEmits<{ assign: [categoryId: string | null]; clear: [] }>();

// The Uncategorised choice clears manual assignments, so it is emitted as a null
// category and kept distinct from the empty placeholder that means "no choice yet".
const uncategorisedValue = 'uncategorised';
const chosen = ref('');

function apply(): void {
  if (props.disabled === true || chosen.value === '') {
    return;
  }
  const categoryId = chosen.value === uncategorisedValue ? null : chosen.value;
  chosen.value = '';
  emit('assign', categoryId);
}
</script>

<template>
  <div
    data-testid="bulk-assignment-bar"
    class="fixed-bar-safe border-t border-rule-strong bg-surface px-4 py-3 shadow-[0_-2px_8px_rgba(32,30,62,0.10)]"
  >
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <p class="min-w-0 flex-1 text-sm text-muted" data-testid="bulk-assignment-count">
        <span class="font-medium text-ink">{{ count }}</span>
        transaction{{ count === 1 ? '' : 's' }} selected
      </p>

      <label class="flex min-w-0 items-center gap-2 text-sm text-muted">
        <span class="sr-only">Category for the selected transactions</span>
        <select
          v-model="chosen"
          data-testid="bulk-assignment-category"
          :disabled="disabled === true"
          class="min-h-11 w-full min-w-0 rounded-sheet border border-rule-strong bg-surface px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:w-auto"
        >
          <option value="">Choose a category</option>
          <option :value="uncategorisedValue">Uncategorised</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.hidden ? `${category.name} (hidden)` : category.name }}
          </option>
        </select>
      </label>

      <button
        type="button"
        data-testid="bulk-assignment-apply"
        :disabled="disabled === true || chosen === ''"
        class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-sheet bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
        @click="apply"
      >
        <AppIcon :icon="IconCheck" />
        Apply
      </button>

      <button
        type="button"
        data-testid="bulk-assignment-clear"
        :disabled="disabled === true"
        class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-sheet border border-rule-strong bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
        @click="emit('clear')"
      >
        <AppIcon :icon="IconX" />
        Clear selection
      </button>
    </div>
  </div>
</template>
