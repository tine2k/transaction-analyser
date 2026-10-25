import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import AppLogo from '../../app/components/AppLogo.vue';

const fills = ['#FF8A3D', '#9B7BFF', '#2DD4BF', '#FF5FA8'];

describe('app logo', () => {
  it('renders the four-wedge mark at 30px with no accessible name', async () => {
    const wrapper = await mountSuspended(AppLogo);
    const logo = wrapper.get('svg[data-testid="application-logo"]');

    expect(logo.attributes('width')).toBe('30');
    expect(logo.attributes('height')).toBe('30');
    expect(logo.attributes('viewBox')).toBe('0 0 32 32');
    expect(logo.attributes('aria-hidden')).toBe('true');
    expect(logo.attributes('focusable')).toBe('false');
    expect(logo.attributes('role')).toBeUndefined();
    expect(logo.attributes('aria-label')).toBeUndefined();
    expect(logo.find('title').exists()).toBe(false);
    expect(logo.text()).toBe('');
    expect(wrapper.find('a').exists()).toBe(false);
    expect(logo.classes()).toContain('shrink-0');

    const wedges = logo.findAll('path[fill]');
    expect(wedges).toHaveLength(4);
    expect(wedges.map((wedge) => wedge.attributes('fill'))).toEqual(fills);
    expect(wedges[3]?.attributes('transform')).toBe('translate(-0.74 -1.42)');
  });

  it('honours an explicit size where the mark is shown larger or smaller', async () => {
    const wrapper = await mountSuspended(AppLogo, { props: { size: 48 } });
    const logo = wrapper.get('svg[data-testid="application-logo"]');

    expect(logo.attributes('width')).toBe('48');
    expect(logo.attributes('height')).toBe('48');
    expect(logo.attributes('viewBox')).toBe('0 0 32 32');
  });
});
