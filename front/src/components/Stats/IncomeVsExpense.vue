<template>
  <div class="income-vs-expense">
    <h4>Revenus vs dépenses ({{ year }})</h4>
    <div
      ref="chartEl"
      class="income-vs-expense__chart"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import Highcharts from 'highcharts'

  const store = useStore()
  const chartEl = ref<HTMLElement | null>(null)

  const data = computed(() => store.state.stats.incomeVsExpense)
  const userID = computed(() => store.state.user.id)
  const year = computed(() => store.state.stats.currentYear)

  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

  const buildChart = () => {
    if (!chartEl.value) return
    const income = data.value?.income ?? []
    const expense = (data.value?.expense ?? []).map((v: number) => Math.abs(v))
    Highcharts.chart(chartEl.value, {
      chart: { type: 'column' },
      credits: { enabled: false },
      title: { text: undefined },
      xAxis: { categories: months },
      yAxis: { title: { text: '€' } },
      tooltip: {
        shared: true,
        valueDecimals: 2,
        valueSuffix: ' €'
      },
      plotOptions: {
        column: { grouping: true }
      },
      series: [
        { type: 'column', name: 'Revenus', data: income, color: '#2e7d32' },
        { type: 'column', name: 'Dépenses', data: expense, color: '#c62828' }
      ]
    } as Highcharts.Options)
  }

  watch(data, buildChart)
  watch(userID, () => store.dispatch('fetchIncomeVsExpense'))
  watch(year, () => store.dispatch('fetchIncomeVsExpense'))

  onMounted(() => {
    if (userID.value) store.dispatch('fetchIncomeVsExpense')
    buildChart()
  })
</script>

<style scoped>
  .income-vs-expense {
    margin: 10px;
    background: var(--bg-card);
    padding: var(--spacing-lg);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
  }
  .income-vs-expense h4 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
  }
  .income-vs-expense__chart {
    width: 100%;
    height: 320px;
  }
</style>
