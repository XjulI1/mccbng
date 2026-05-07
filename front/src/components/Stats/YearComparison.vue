<template>
  <div
    ref="chartEl"
    class="year-comparison__chart"
  />
</template>

<script setup lang="ts">
  import { ref, watch, onMounted } from 'vue'
  import Highcharts from 'highcharts'

  type ComparisonData = {
    yearA: number[]
    yearB: number[]
    deltaPct: (number | null)[]
  }

  const props = defineProps<{
    yearA: number
    yearB: number
    data: ComparisonData
  }>()

  const chartEl = ref<HTMLElement | null>(null)
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

  const buildChart = () => {
    if (!chartEl.value) return
    Highcharts.chart(chartEl.value, {
      chart: { type: 'column' },
      credits: { enabled: false },
      title: { text: undefined },
      xAxis: { categories: months },
      yAxis: [
        { title: { text: 'Total (€)' } },
        { title: { text: 'Δ %' }, opposite: true }
      ],
      tooltip: { shared: true, valueDecimals: 2 },
      series: [
        { type: 'column', name: String(props.yearA), data: props.data.yearA ?? [] },
        { type: 'column', name: String(props.yearB), data: props.data.yearB ?? [] },
        {
          type: 'line',
          name: 'Δ %',
          data: props.data.deltaPct ?? [],
          yAxis: 1,
          dashStyle: 'ShortDash',
          marker: { enabled: true }
        }
      ]
    } as Highcharts.Options)
  }

  watch(() => props.data, buildChart, { deep: true })
  onMounted(buildChart)
</script>

<style scoped>
  .year-comparison__chart {
    width: 100%;
    height: 360px;
  }
</style>
