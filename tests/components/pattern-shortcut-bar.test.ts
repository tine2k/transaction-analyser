import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import PatternShortcutBar from '../../app/components/PatternShortcutBar.vue';

const categories = [
  { id: '1', name: 'Groceries', hidden: false },
  { id: '2', name: 'Internal', hidden: true },
];

function mountBar(props: Record<string, unknown> = {}) {
  return mountSuspended(PatternShortcutBar, {
    props: {
      text: 'REWE Markt',
      categories,
      previewState: 'ready',
      previewCount: 12,
      status: null,
      statusKind: 'info',
      ...props,
    },
  });
}

describe('pattern shortcut bar', () => {
  it('shows the captured text and the stored categories, marking hidden ones', async () => {
    const wrapper = await mountBar();

    expect(wrapper.get('[data-testid="pattern-shortcut-text"]').text()).toBe('REWE Markt');
    const options = wrapper.findAll('[data-testid="pattern-shortcut-category"] option');
    expect(options.map((option) => option.text())).toEqual([
      'Choose a category',
      'Groceries',
      'Internal (hidden)',
    ]);
    expect(options.map((option) => option.attributes('value'))).toEqual(['', '1', '2']);
  });

  it('emits the chosen category and resets the control for the next choice', async () => {
    const wrapper = await mountBar();
    const select = wrapper.get('[data-testid="pattern-shortcut-category"]');

    await select.setValue('2');

    expect(wrapper.emitted('choose')).toEqual([['2']]);
    expect((select.element as HTMLSelectElement).value).toBe('');
  });

  it('emits a dismissal', async () => {
    const wrapper = await mountBar();

    await wrapper.get('[data-testid="pattern-shortcut-dismiss"]').trigger('click');

    expect(wrapper.emitted('dismiss')).toHaveLength(1);
  });

  it('shows the preview states', async () => {
    expect((await mountBar({ previewState: 'loading', previewCount: null }))
      .get('[data-testid="pattern-shortcut-preview"]').text()).toContain('Checking matching transactions');
    expect((await mountBar()).get('[data-testid="pattern-shortcut-preview"]').text()).toContain('Matches 12 stored transactions');
    expect((await mountBar({ previewState: 'ready', previewCount: 1 }))
      .get('[data-testid="pattern-shortcut-preview"]').text()).toContain('Matches 1 stored transaction');
    expect((await mountBar({ previewState: 'unavailable', previewCount: null }))
      .get('[data-testid="pattern-shortcut-preview"]').text()).toContain('Match count unavailable');
  });

  it('reports a status and keeps it distinct from an error', async () => {
    const info = await mountBar({ text: null, status: 'Added to Groceries' });
    expect(info.get('[data-testid="pattern-shortcut-status"]').text()).toBe('Added to Groceries');
    expect(info.get('[data-testid="pattern-shortcut-status"]').classes()).not.toContain('text-red-700');

    const failure = await mountBar({ text: null, status: 'Could not add to Travel', statusKind: 'error' });
    expect(failure.get('[data-testid="pattern-shortcut-status"]').classes()).toContain('text-red-700');
  });

  it('renders nothing when there is neither a selection nor a status', async () => {
    const wrapper = await mountBar({ text: null, status: null });

    expect(wrapper.find('[data-testid="pattern-shortcut-bar"]').exists()).toBe(false);
  });

  it('offers touch-sized controls and a keyboard-reachable category control', async () => {
    const wrapper = await mountBar();
    const select = wrapper.get('[data-testid="pattern-shortcut-category"]');

    expect(select.classes()).toContain('min-h-11');
    expect(wrapper.get('[data-testid="pattern-shortcut-dismiss"]').classes()).toContain('min-h-11');
    expect(select.attributes('disabled')).toBeUndefined();
    expect(select.element.tagName).toBe('SELECT');
  });

  it('disables the category control when no category is stored', async () => {
    const wrapper = await mountBar({ categories: [] });

    expect(wrapper.get('[data-testid="pattern-shortcut-category"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="pattern-shortcut-category"]').text()).toContain('No categories stored');
  });
});
