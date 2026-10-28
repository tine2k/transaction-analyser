import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';

const route = vi.hoisted(() => ({ path: '/' }));

mockNuxtImport('useRoute', () => () => route);

import DefaultLayout from '../../app/layouts/default.vue';

describe('default layout navigation', () => {
  it('names the application in the brand bar and puts the decorative mark before it', async () => {
    route.path = '/';
    const wrapper = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });

    const header = wrapper.get('header');
    const wordmark = header.get('p');
    const logo = header.get('svg[data-testid="application-logo"]');
    const toggle = header.get('[data-testid="mobile-navigation-toggle"]');
    const brand = logo.element.parentElement;

    expect(wordmark.text()).toBe('Expenses');
    expect(header.classes()).toContain('brand-bar');
    expect(logo.attributes('width')).toBe('30');
    expect(logo.attributes('height')).toBe('30');
    expect(logo.attributes('aria-hidden')).toBe('true');
    expect(logo.attributes('aria-label')).toBeUndefined();
    expect(logo.find('title').exists()).toBe(false);
    expect(logo.text()).toBe('');
    expect(wordmark.element.previousElementSibling).toBe(logo.element);
    expect(toggle.element.parentElement?.firstElementChild).toBe(toggle.element);
    expect(toggle.element.nextElementSibling).toBe(brand);
    expect(logo.element.closest('a')).toBeNull();
    expect(header.findAll('a')).toHaveLength(5);
    expect(header.findAll('button')).toHaveLength(1);
    expect(header.text().match(/Expenses/g)).toHaveLength(1);
    await wrapper.unmount();
  });

  it('links to the five destinations and marks the current screen', async () => {
    route.path = '/';
    const transactions = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });
    const links = transactions.findAll('nav a');

    expect(links.map((link) => [link.text(), link.attributes('href')])).toEqual([
      ['Transactions', '/'],
      ['Monthly', '/monthly'],
      ['Yearly', '/yearly'],
      ['Monthly average', '/monthly-average'],
      ['Manage', '/manage'],
    ]);
    expect(links.every((link) => link.findAll('svg').length === 0)).toBe(true);
    expect(links[0]?.attributes('aria-current')).toBe('page');
    expect(links[0]?.classes()).toContain('bg-surface');
    expect(links[1]?.classes()).toContain('bg-white/10');
    await transactions.unmount();

    route.path = '/monthly';
    const monthly = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });
    expect(monthly.findAll('nav a')[1]?.attributes('aria-current')).toBe('page');
    expect(monthly.findAll('nav a')[1]?.classes()).toContain('bg-surface');
    await monthly.unmount();

    route.path = '/yearly';
    const yearly = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });
    expect(yearly.findAll('nav a')[2]?.text()).toBe('Yearly');
    expect(yearly.findAll('nav a')[2]?.attributes('aria-current')).toBe('page');
    await yearly.unmount();

    route.path = '/monthly-average';
    const monthlyAverage = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });
    expect(monthlyAverage.findAll('nav a')[3]?.text()).toBe('Monthly average');
    expect(monthlyAverage.findAll('nav a')[3]?.attributes('aria-current')).toBe('page');
    await monthlyAverage.unmount();

    route.path = '/manage';
    const manage = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });
    expect(manage.findAll('nav a')[4]?.text()).toBe('Manage');
    expect(manage.findAll('nav a')[4]?.attributes('aria-current')).toBe('page');
    expect(manage.findAll('nav a')[4]?.classes()).toContain('bg-surface');
    await manage.unmount();
  });

  it('marks Manage as the current section on the screens it contains', async () => {
    for (const path of ['/categories', '/people', '/imports']) {
      route.path = path;
      const wrapper = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });
      const links = wrapper.findAll('nav a');

      expect(links).toHaveLength(5);
      expect(links[4]?.text()).toBe('Manage');
      expect(links[4]?.attributes('aria-current')).toBe('true');
      expect(links[4]?.classes()).toContain('bg-surface');
      expect(wrapper.find('nav a[href="/categories"]').exists()).toBe(false);
      expect(wrapper.find('nav a[href="/people"]').exists()).toBe(false);
      expect(wrapper.find('nav a[href="/imports"]').exists()).toBe(false);

      await wrapper.unmount();
    }
  });

  it('exposes and toggles the mobile navigation and closes it after choosing a destination', async () => {
    route.path = '/';
    const wrapper = await mountSuspended(DefaultLayout, { slots: { default: 'screen' } });
    const toggle = wrapper.get('[data-testid="mobile-navigation-toggle"]');

    expect(toggle.attributes('aria-controls')).toBe('screen-navigation');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(toggle.attributes('aria-label')).toBe('Open screen navigation');
    expect(toggle.findAll('svg[aria-hidden="true"]')).toHaveLength(1);
    expect(wrapper.findAll('#screen-navigation a')).toHaveLength(5);

    await toggle.trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('true');
    expect(toggle.attributes('aria-label')).toBe('Close screen navigation');

    await wrapper.get('#screen-navigation a[href="/manage"]').trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('false');
  });
});
