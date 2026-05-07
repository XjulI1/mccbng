<template>
  <div
    ref="chartEl"
    class="savings-rate__chart"
  />
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import Highcharts from 'highcharts'

  const props = defineProps<{
    rates:(number | null)[]
  }>()

  const chartEl = ref<HTMLElement | null>(null)
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

  const average = computed(() => {
    const valid = (props.rates ?? []).filter(
      (r): r is number => typeof r === 'number'
    )
    if (valid.length === 0) return null
    return Math.round((valid.reduce((s, r) => s + r, 0) / valid.length) * 100) / 100
  })

  const buildChart = () => {
    if (!chartEl.value) return
    Highcharts.chart(chartEl.value, {
      chart: { type: 'line' },
      credits: { enabled: false },
      title: { text: undefined },
      xAxis: { categories: months },
      yAxis: {
        title: { text: '%' },
        plotLines: average.value !== null
          ? [{
            value: average.value,
            color: '#888',
            dashStyle: 'Dash',
            width: 2,
            label: { text: `Moyenne: ${average.value}%` }
          }]
          : []
      },
      tooltip: { valueDecimals: 2, valueSuffix: ' %' },
      legend: { enabled: false },
      series: [
        {
          type: 'line',
          name: "Taux d'épargne",
          data: props.rates ?? [],
          marker: { enabled: true }
        }
      ]
    } as Highcharts.Options)
  }

  watch(() => props.rates, buildChart, { deep: true })
  onMounted(buildChart)
</script>

<style scoped>
  .savings-rate__chart {
    width: 100%;
    height: 280px;
  }
</style>
