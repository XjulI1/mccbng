<template>
  <div class="savings-rate">
    <h4>Taux d'épargne ({{ year }})</h4>
    <div
      ref="chartEl"
      class="savings-rate__chart"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import Highcharts from 'highcharts'

  const store = useStore()
  const chartEl = ref<HTMLElement | null>(null)

  const rates = computed<(number | null)[]>(() => store.getters.getSavingsRate)
  const userID = computed(() => store.state.user.id)
  const year = computed(() => store.state.stats.currentYear)

  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

  const average = computed(() => {
    const valid = rates.value.filter((r): r is number => typeof r === 'number')
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
          data: rates.value,
          marker: { enabled: true }
        }
      ]
    } as Highcharts.Options)
  }

  watch(rates, buildChart, { deep: true })
  watch(userID, () => store.dispatch('fetchIncomeVsExpense'))
  watch(year, () => store.dispatch('fetchIncomeVsExpense'))

  onMounted(() => {
    if (userID.value) store.dispatch('fetchIncomeVsExpense')
    buildChart()
  })
</script>

<style scoped>
  .savings-rate {
    margin: 10px;
    background: var(--bg-card);
    padding: var(--spacing-lg);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
  }
  .savings-rate h4 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
  }
  .savings-rate__chart {
    width: 100%;
    height: 280px;
  }
</style>
