<template>
  <div class="top-categories">
    <h4>Top catégories de dépense</h4>
    <div
      ref="chartEl"
      class="top-categories__chart"
    />
    <operation-list
      v-if="selectedCatId"
      class="top-categories__operation-list"
      :OperationRenderer="OperationRenderer"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import Highcharts from 'highcharts'
  import OperationList from '../OperationList.vue'
  import OperationRenderer from '../Home/Operation.vue'

  const store = useStore()
  const chartEl = ref<HTMLElement | null>(null)
  const selectedCatId = ref<number | null>(null)

  const list = computed(() => store.state.stats.topCategories)
  const userID = computed(() => store.state.user.id)
  const periodFrom = computed(() => store.state.stats.periodFrom)
  const periodTo = computed(() => store.state.stats.periodTo)

  const buildChart = () => {
    if (!chartEl.value) return
    const items = list.value ?? []
    Highcharts.chart(chartEl.value, {
      chart: { type: 'bar' },
      credits: { enabled: false },
      title: { text: undefined },
      xAxis: {
        categories: items.map((it: any) => it.libelle ?? `#${it.IDcat}`),
        title: { text: undefined }
      },
      yAxis: { title: { text: 'Total (€)' } },
      legend: { enabled: false },
      tooltip: { valueDecimals: 2, valueSuffix: ' €' },
      plotOptions: {
        series: {
          point: {
            events: {
              click: function (this: Highcharts.Point) {
                const idx = this.x as number
                selectedCatId.value = items[idx]?.IDcat ?? null
              }
            }
          }
        }
      },
      series: [
        {
          type: 'bar',
          name: 'Total',
          data: items.map((it: any) => Number(it.total) || 0),
          colorByPoint: true
        }
      ]
    } as Highcharts.Options)
  }

  watch(list, buildChart)
  watch(userID, () => store.dispatch('fetchTopCategories'))

  watch(selectedCatId, () => {
    if (!selectedCatId.value) return
    store.dispatch('fetchOperations', {
      IDcat: selectedCatId.value,
      and: [
        { DateOp: { gte: new Date(periodFrom.value + ' 00:00:00Z') } },
        { DateOp: { lte: new Date(periodTo.value + ' 23:59:59Z') } }
      ]
    })
  })

  onMounted(() => {
    if (userID.value) store.dispatch('fetchTopCategories')
    buildChart()
  })
</script>

<style scoped>
  .top-categories {
    margin: 10px;
    background: var(--bg-card);
    padding: var(--spacing-lg);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
  }
  .top-categories h4 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
  }
  .top-categories__chart {
    width: 100%;
    height: 360px;
  }
  .top-categories__operation-list {
    margin-top: var(--spacing-md);
  }
</style>
