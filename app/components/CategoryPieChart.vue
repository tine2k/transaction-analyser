<script lang="ts">
import { PieChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent } from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

use([CanvasRenderer, PieChart, LegendComponent, TooltipComponent]);
</script>

<script setup lang="ts">
import type { EChartsOption } from 'echarts';
import VChart from 'vue-echarts';

defineProps<{ option: EChartsOption }>();
</script>

<template>
  <div class="h-96 w-full">
    <VChart class="w-full" :option="option" autoresize />
  </div>
</template>
