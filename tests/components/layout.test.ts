import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';

const route = vi.hoisted(() => ({ path: '/' }));

mockNuxtImport('useRoute', () => () => route);

import DefaultLayout from '../../app/layouts/default.vue';

describe('default layout navigation', () => {
  it('links to each screen and marks the current screen', async () => {
    route.path = '/';
    const transactions = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });
    const links = transactions.findAll('nav a');

    expect(links.map((link) => [link.text(), link.attributes('href')])).toEqual([
      ['Transactions', '/'],
      ['Categories', '/categories'],
      ['Analytics', '/analytics'],
      ['Monthly totals', '/monthly-totals'],
      ['Monthly average', '/monthly-average'],
    ]);
    expect(links[0]?.attributes('aria-current')).toBe('page');
    await transactions.unmount();

    route.path = '/analytics';
    const analytics = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });
    expect(analytics.findAll('nav a')[2]?.attributes('aria-current')).toBe('page');
    await analytics.unmount();

    route.path = '/monthly-totals';
    const monthlyTotals = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });
    expect(monthlyTotals.findAll('nav a')[3]?.attributes('aria-current')).toBe('page');
    await monthlyTotals.unmount();

    route.path = '/monthly-average';
    const monthlyAverage = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });
    expect(monthlyAverage.findAll('nav a')[4]?.text()).toBe('Monthly average');
    expect(monthlyAverage.findAll('nav a')[4]?.attributes('aria-current')).toBe('page');
  });

  it('exposes and toggles the mobile navigation and closes it after choosing a destination', async () => {
    route.path = '/';
    const wrapper = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });
    const toggle = wrapper.get('[data-testid="mobile-navigation-toggle"]');

    expect(toggle.attributes('aria-controls')).toBe('screen-navigation');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(wrapper.findAll('#screen-navigation a')).toHaveLength(5);

    await toggle.trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('true');

    await wrapper.get('#screen-navigation a[href="/categories"]').trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('false');
  });
});
