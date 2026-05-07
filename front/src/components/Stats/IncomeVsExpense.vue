<template>
  <div
    ref="chartEl"
    class="income-vs-expense__chart"
  />
</template>

<script setup lang="ts">
  import { ref, watch, onMounted } from 'vue'
  import Highcharts from 'highcharts'

  type IncomeExpense = {
    income: number[]
    expense: number[]
  }

  const props = defineProps<{
    data: IncomeExpense
  }>()

  const chartEl = ref<HTMLElement | null>(null)
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

  const buildChart = () => {
    if (!chartEl.value) return
    const income = props.data?.income ?? []
    const expense = (props.data?.expense ?? []).map((v) => Math.abs(v))
    Highcharts.chart(chartEl.value, {
      chart: { type: 'column' },
      credits: { enabled: false },
      title: { text: undefined },
      xAxis: { categories: months },
      yAxis: { title: { text: '€' } },
      tooltip: { shared: true, valueDecimals: 2, valueSuffix: ' €' },
      plotOptions: { column: { grouping: true } },
      series: [
        { type: 'column', name: 'Revenus', data: income, color: '#2e7d32' },
        { type: 'column', name: 'Dépenses', data: expense, color: '#c62828' }
      ]
    } as Highcharts.Options)
  }

  watch(() => props.data, buildChart, { deep: true })
  onMounted(buildChart)
</script>

<style scoped>
  .income-vs-expense__chart {
    width: 100%;
    height: 320px;
  }
</style>
