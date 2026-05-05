<template>
  <div class="year-comparison">
    <div class="year-comparison__header">
      <h4>Comparaison année / année</h4>
      <div class="year-comparison__selects">
        <label>
          Année A
          <select
            :value="yearA"
            @change="onYearAChange"
          >
            <option
              v-for="y in availableYears"
              :key="'a-' + y"
              :value="y"
            >
              {{ y }}
            </option>
          </select>
        </label>
        <label>
          Année B
          <select
            :value="yearB"
            @change="onYearBChange"
          >
            <option
              v-for="y in availableYears"
              :key="'b-' + y"
              :value="y"
            >
              {{ y }}
            </option>
          </select>
        </label>
      </div>
    </div>
    <div
      ref="chartEl"
      class="year-comparison__chart"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import Highcharts from 'highcharts'

  const store = useStore()
  const chartEl = ref<HTMLElement | null>(null)

  const yearA = computed(() => store.state.stats.comparisonYearA)
  const yearB = computed(() => store.state.stats.comparisonYearB)
  const data = computed(() => store.state.stats.yearComparison)
  const userID = computed(() => store.state.user.id)

  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  const currentYear = new Date().getFullYear()
  const availableYears = computed(() =>
    [...Array(currentYear - 2016).keys()].map((k) => k + 2017)
  )

  const onYearAChange = (e: Event) => {
    store.dispatch('changeComparisonYearA', parseInt((e.target as HTMLInputElement).value))
  }
  const onYearBChange = (e: Event) => {
    store.dispatch('changeComparisonYearB', parseInt((e.target as HTMLInputElement).value))
  }

  const buildChart = () => {
    if (!chartEl.value) return
    Highcharts.chart(chartEl.value, {
      chart: { type: 'column' },
      credits: { enabled: false },
      title: { text: undefined },
      xAxis: { categories: months },
      yAxis: [
        { title: { text: 'Total (€)' } },
        {
          title: { text: 'Δ %' },
          opposite: true
        }
      ],
      tooltip: { shared: true, valueDecimals: 2 },
      series: [
        {
          type: 'column',
          name: String(yearA.value),
          data: data.value.yearA ?? []
        },
        {
          type: 'column',
          name: String(yearB.value),
          data: data.value.yearB ?? []
        },
        {
          type: 'line',
          name: 'Δ %',
          data: data.value.deltaPct ?? [],
          yAxis: 1,
          dashStyle: 'ShortDash',
          marker: { enabled: true }
        }
      ]
    } as Highcharts.Options)
  }

  watch(data, buildChart)
  watch(userID, () => store.dispatch('fetchYearComparison'))

  onMounted(() => {
    if (userID.value) store.dispatch('fetchYearComparison')
    buildChart()
  })
</script>

<style scoped>
  .year-comparison {
    margin: 10px;
    background: var(--bg-card);
    padding: var(--spacing-lg);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
  }
  .year-comparison__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }
  .year-comparison__header h4 {
    margin: 0;
    color: var(--text-primary);
  }
  .year-comparison__selects {
    display: flex;
    gap: var(--spacing-md);
    color: var(--text-primary);
  }
  .year-comparison__selects select {
    margin-left: var(--spacing-sm);
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
  }
  .year-comparison__chart {
    width: 100%;
    height: 360px;
  }
</style>
