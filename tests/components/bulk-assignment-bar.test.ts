import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import BulkAssignmentBar from '../../app/components/BulkAssignmentBar.vue';

const categories = [
  { id: '1', name: 'Groceries', hidden: false },
  { id: '2', name: 'Internal', hidden: true },
];

function mountBar(props: Record<string, unknown> = {}) {
  return mountSuspended(BulkAssignmentBar, {
    props: {
      count: 3,
      categories,
      ...props,
    },
  });
}

describe('bulk assignment bar', () => {
  it('states how many transactions are selected', async () => {
    expect((await mountBar()).get('[data-testid="bulk-assignment-count"]').text())
      .toContain('3 transactions selected');
    expect((await mountBar({ count: 1 })).get('[data-testid="bulk-assignment-count"]').text())
      .toContain('1 transaction selected');
  });

  it('offers the stored categories, marks hidden ones, and offers Uncategorised', async () => {
    const wrapper = await mountBar();

    const options = wrapper.findAll('[data-testid="bulk-assignment-category"] option');
    expect(options.map((option) => option.text())).toEqual([
      'Choose a category',
      'Uncategorised',
      'Groceries',
      'Internal (hidden)',
    ]);
    expect(options.map((option) => option.attributes('value'))).toEqual(['', 'uncategorised', '1', '2']);
  });

  it('applies the chosen category and resets the control', async () => {
    const wrapper = await mountBar();
    const select = wrapper.get('[data-testid="bulk-assignment-category"]');
    const apply = wrapper.get('[data-testid="bulk-assignment-apply"]');

    expect(apply.attributes('disabled')).toBeDefined();

    await select.setValue('2');
    expect(apply.attributes('disabled')).toBeUndefined();
    await apply.trigger('click');

    expect(wrapper.emitted('assign')).toEqual([['2']]);
    expect((select.element as HTMLSelectElement).value).toBe('');
    expect(apply.attributes('disabled')).toBeDefined();
  });

  it('applies Uncategorised as a null category', async () => {
    const wrapper = await mountBar();

    await wrapper.get('[data-testid="bulk-assignment-category"]').setValue('uncategorised');
    await wrapper.get('[data-testid="bulk-assignment-apply"]').trigger('click');

    expect(wrapper.emitted('assign')).toEqual([[null]]);
  });

  it('clears the selection without assigning', async () => {
    const wrapper = await mountBar();

    await wrapper.get('[data-testid="bulk-assignment-clear"]').trigger('click');

    expect(wrapper.emitted('clear')).toHaveLength(1);
    expect(wrapper.emitted('assign')).toBeUndefined();
  });

  it('disables its controls while an assignment is in flight', async () => {
    const wrapper = await mountBar({ disabled: true });

    expect(wrapper.get('[data-testid="bulk-assignment-category"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="bulk-assignment-apply"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="bulk-assignment-clear"]').attributes('disabled')).toBeDefined();
  });

  it('offers touch-sized controls that are keyboard reachable', async () => {
    const wrapper = await mountBar();

    expect(wrapper.get('[data-testid="bulk-assignment-category"]').classes()).toContain('min-h-11');
    expect(wrapper.get('[data-testid="bulk-assignment-apply"]').classes()).toContain('min-h-11');
    expect(wrapper.get('[data-testid="bulk-assignment-clear"]').classes()).toContain('min-h-11');
    expect(wrapper.get('[data-testid="bulk-assignment-apply"]').element.tagName).toBe('BUTTON');
  });
});
