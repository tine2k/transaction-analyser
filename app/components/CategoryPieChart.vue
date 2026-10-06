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
const emit = defineEmits<{ click: [parameter: unknown] }>();
</script>

<template>
  <div class="h-96 w-full min-w-0">
    <VChart class="h-full w-full min-w-0" :option="option" autoresize @click="emit('click', $event)" />
  </div>
</template>
