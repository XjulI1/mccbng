<template>
  <div>
    <div
      ref="chartEl"
      class="top-categories__chart"
    />
    <operation-list
      v-if="selectedCatId"
      class="top-categories__operation-list"
      :OperationRenderer="OperationRenderer"
      :read-only="true"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, watch, onMounted } from 'vue'
  import { useOperationStore } from '@/stores/operation'
  import { dateOpWithin, dayRange } from '@/utils/dates'
  import Highcharts from 'highcharts'
  import OperationList from '../OperationList.vue'
  import OperationRenderer from '../Home/Operation.vue'

  type TopCategoryItem = { IDcat: number; libelle: string; total: number }

  const props = defineProps<{
    items: TopCategoryItem[]
    from: string
    to: string
  }>()

  const operationStore = useOperationStore()
  const chartEl = ref<HTMLElement | null>(null)
  const selectedCatId = ref<number | null>(null)

  const buildChart = () => {
    if (!chartEl.value) return
    const items = props.items ?? []
    Highcharts.chart(chartEl.value, {
      chart: { type: 'bar' },
      credits: { enabled: false },
      title: { text: undefined },
      xAxis: {
        categories: items.map((it) => it.libelle ?? `#${it.IDcat}`),
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
          data: items.map((it) => Number(it.total) || 0),
          colorByPoint: true
        }
      ]
    } as Highcharts.Options)
  }

  watch(() => props.items, buildChart, { deep: true })

  watch(selectedCatId, () => {
    if (!selectedCatId.value) return
    operationStore.fetchOperations({
      IDcat: selectedCatId.value,
      and: dateOpWithin(dayRange(props.from, props.to))
    })
  })

  onMounted(buildChart)
</script>

<style scoped>
  .top-categories__chart {
    width: 100%;
    height: 360px;
  }
  .top-categories__operation-list {
    margin-top: var(--spacing-md);
  }
</style>
