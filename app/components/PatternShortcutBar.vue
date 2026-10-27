<script setup lang="ts">
// The fixed action bar through which a text selection in the transactions table
// becomes a category pattern. It is presentational: it shows the captured text,
// the stored categories, the literal match count, and the page's status, and it
// emits the chosen category or a dismissal. It evaluates no regular expression
// and performs no request of its own.
//
// See openspec/changes/add-transaction-pattern-shortcut/specs/transaction-pattern-shortcut/spec.md
import { IconPlus } from '@tabler/icons-vue';

type BarCategory = { id: string; name: string; hidden: boolean };

defineProps<{
  text: string | null;
  categories: ReadonlyArray<BarCategory>;
  previewState: 'idle' | 'loading' | 'ready' | 'unavailable';
  previewCount: number | null;
  status: string | null;
  statusKind: 'info' | 'error';
}>();

const emit = defineEmits<{ choose: [id: string]; dismiss: [] }>();

// Choosing a category fires immediately and resets the control, so the same
// bar can be used again without a stale selection.
function choose(event: Event): void {
  const select = event.target as HTMLSelectElement;
  const id = select.value;
  select.value = '';
  if (id !== '') {
    emit('choose', id);
  }
}
</script>

<template>
  <div
    v-if="text !== null || status !== null"
    data-testid="pattern-shortcut-bar"
    class="fixed-bar-safe border-t border-rule-strong bg-surface px-4 py-3 shadow-[0_-2px_8px_rgba(32,30,62,0.10)]"
  >
    <div class="w-full">
      <p
        v-if="status !== null"
        role="status"
        aria-live="polite"
        data-testid="pattern-shortcut-status"
        class="text-sm"
        :class="statusKind === 'error' ? 'text-failure' : 'text-muted'"
      >
        {{ status }}
      </p>

      <div v-if="text !== null" class="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <p class="min-w-0 flex-1 truncate text-sm text-muted">
          <AppIcon :icon="IconPlus" class="mr-2 align-middle" />
          Add "<span class="font-medium text-ink" data-testid="pattern-shortcut-text">{{ text }}</span>" to:
        </p>

        <label class="flex min-w-0 items-center gap-2 text-sm text-muted">
          <span class="sr-only">Category</span>
          <select
            data-testid="pattern-shortcut-category"
            :disabled="categories.length === 0"
            class="min-h-11 w-full min-w-0 rounded-sheet border border-rule-strong bg-surface px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:w-auto"
            @change="choose"
          >
            <option value="">{{ categories.length === 0 ? 'No categories stored' : 'Choose a category' }}</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.hidden ? `${category.name} (hidden)` : category.name }}
            </option>
          </select>
        </label>

        <p class="text-xs text-muted sm:w-44" data-testid="pattern-shortcut-preview">
          <template v-if="previewState === 'loading'">Checking matching transactions…</template>
          <template v-else-if="previewState === 'ready'">
            Matches {{ previewCount }} stored transaction{{ previewCount === 1 ? '' : 's' }}.
          </template>
          <template v-else-if="previewState === 'unavailable'">Match count unavailable.</template>
          <template v-else>No match count yet.</template>
        </p>

        <button
          type="button"
          data-testid="pattern-shortcut-dismiss"
          class="min-h-11 shrink-0 rounded-sheet border border-rule-strong bg-surface px-3 text-xs font-medium text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          @click="emit('dismiss')"
        >
          Dismiss
        </button>
      </div>
    </div>
  </div>
</template>
