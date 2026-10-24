import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';

const route = vi.hoisted(() => ({ path: '/' }));

mockNuxtImport('useRoute', () => () => route);

import DefaultLayout from '../../app/layouts/default.vue';

describe('default layout navigation', () => {
  it('names the application in the masthead', async () => {
    route.path = '/';
    const wrapper = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });

    expect(wrapper.get('header p').text()).toBe('Expenses');
    await wrapper.unmount();
  });

  it('links to each screen and marks the current screen', async () => {
    route.path = '/';
    const transactions = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });
    const links = transactions.findAll('nav a');

    expect(links.map((link) => [link.text(), link.attributes('href')])).toEqual([
      ['Transactions', '/'],
      ['Categories', '/categories'],
      ['People', '/people'],
      ['Analytics', '/analytics'],
      ['Monthly totals', '/monthly-totals'],
      ['Monthly average', '/monthly-average'],
      ['Imports', '/imports'],
    ]);
    expect(links.every((link) => link.findAll('svg[aria-hidden="true"]').length === 1)).toBe(true);
    expect(links.every((link) => link.get('svg').attributes('stroke-width') === '1.5')).toBe(true);
    expect(links[0]?.attributes('aria-current')).toBe('page');
    await transactions.unmount();

    route.path = '/analytics';
    const analytics = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });
    expect(analytics.findAll('nav a')[3]?.attributes('aria-current')).toBe('page');
    await analytics.unmount();

    route.path = '/people';
    const people = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });
    expect(people.findAll('nav a')[2]?.text()).toBe('People');
    expect(people.findAll('nav a')[2]?.attributes('aria-current')).toBe('page');
    await people.unmount();

    route.path = '/monthly-totals';
    const monthlyTotals = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });
    expect(monthlyTotals.findAll('nav a')[4]?.attributes('aria-current')).toBe('page');
    await monthlyTotals.unmount();

    route.path = '/monthly-average';
    const monthlyAverage = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });
    expect(monthlyAverage.findAll('nav a')[5]?.text()).toBe('Monthly average');
    expect(monthlyAverage.findAll('nav a')[5]?.attributes('aria-current')).toBe('page');
    await monthlyAverage.unmount();

    route.path = '/imports';
    const imports = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });
    expect(imports.findAll('nav a')[6]?.text()).toBe('Imports');
    expect(imports.findAll('nav a')[6]?.attributes('aria-current')).toBe('page');
  });

  it('exposes and toggles the mobile navigation and closes it after choosing a destination', async () => {
    route.path = '/';
    const wrapper = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });
    const toggle = wrapper.get('[data-testid="mobile-navigation-toggle"]');

    expect(toggle.attributes('aria-controls')).toBe('screen-navigation');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(toggle.attributes('aria-label')).toBe('Open screen navigation');
    expect(toggle.findAll('svg[aria-hidden="true"]')).toHaveLength(1);
    expect(wrapper.findAll('#screen-navigation a')).toHaveLength(7);

    await toggle.trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('true');
    expect(toggle.attributes('aria-label')).toBe('Close screen navigation');

    await wrapper.get('#screen-navigation a[href="/categories"]').trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('false');
  });
});
