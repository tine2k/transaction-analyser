import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import { IconList } from '@tabler/icons-vue';
import AppIcon from '../../app/components/AppIcon.vue';

describe('app icon', () => {
  it('renders the given icon at 16px with a 1.5 stroke and no accessible name', async () => {
    const wrapper = await mountSuspended(AppIcon, { props: { icon: IconList } });
    const icon = wrapper.get('svg');

    expect(icon.attributes('width')).toBe('16');
    expect(icon.attributes('height')).toBe('16');
    expect(icon.attributes('stroke-width')).toBe('1.5');
    expect(icon.attributes('aria-hidden')).toBe('true');
    expect(icon.attributes('stroke')).toBe('currentColor');
    expect(wrapper.get('span').classes()).toContain('shrink-0');
  });

  it('honours a smaller size where an inline marker needs one', async () => {
    const wrapper = await mountSuspended(AppIcon, { props: { icon: IconList, size: 14 } });
    const icon = wrapper.get('svg');

    expect(icon.attributes('width')).toBe('14');
    expect(icon.attributes('height')).toBe('14');
    expect(icon.attributes('stroke-width')).toBe('1.5');
  });
});
