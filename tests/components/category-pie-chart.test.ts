import { mountSuspended } from '@nuxt/test-utils/runtime';
import { defineComponent } from 'vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('vue-echarts', () => ({
  default: defineComponent({
      name: 'VChart',
      props: ['option'],
      emits: ['click'],
      template: '<div data-testid="echarts-chart" />',
  }),
}));

import CategoryPieChart from '../../app/components/CategoryPieChart.vue';

describe('category pie chart adapter', () => {
  it('mounts the Vue ECharts component and passes the chart option', async () => {
    const option = {
      series: [{ type: 'pie' as const, data: [{ name: 'Groceries', value: 12.5 }] }],
    };
    const wrapper = await mountSuspended(CategoryPieChart, { props: { option } });

    expect(wrapper.get('[data-testid="echarts-chart"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="echarts-chart"]').element.parentElement?.className)
      .toContain('h-96');
    expect(wrapper.findComponent({ name: 'VChart' }).props('option')).toEqual(option);
  });

  it('forwards pie slice click events to its parent', async () => {
    const wrapper = await mountSuspended(CategoryPieChart, {
      props: { option: { series: [{ type: 'pie' as const, data: [] }] } },
    });
    const parameter = { data: { key: 'category:1' } };

    wrapper.findComponent({ name: 'VChart' }).vm.$emit('click', parameter);

    expect(wrapper.emitted('click')).toEqual([[parameter]]);
  });
});
