<template>
  <div>
    <div
      ref="chartEl"
      class="category-heatmap__chart"
    />
    <operation-list
      v-if="selectedCellOp"
      class="category-heatmap__operation-list"
      :OperationRenderer="OperationRenderer"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, watch, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import Highcharts from 'highcharts'
  import 'highcharts/modules/heatmap'
  import OperationList from '../OperationList.vue'
  import OperationRenderer from './Operation.vue'

  type HeatmapCategory = { IDcat: number; libelle: string }
  type HeatmapData = {
    categories: HeatmapCategory[]
    data: [number, number, number][]
  }

  const props = defineProps<{
    year: number
    data: HeatmapData
  }>()

  const store = useStore()
  const chartEl = ref<HTMLElement | null>(null)
  const selectedCellOp = ref<{ month: number; cat: number } | null>(null)

  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

  const lastDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 0).getDate()

  const buildChart = () => {
    if (!chartEl.value) return
    const cats = props.data?.categories ?? []
    const data = props.data?.data ?? []

    Highcharts.chart(chartEl.value, {
      chart: {
        type: 'heatmap',
        marginTop: 40,
        marginBottom: 80
      },
      credits: { enabled: false },
      title: { text: undefined },
      xAxis: { categories: months },
      yAxis: {
        categories: cats.map((c) => c.libelle),
        title: { text: undefined },
        reversed: true
      },
      colorAxis: {
        min: Math.min(...data.map((d) => d[2]), 0),
        max: 0,
        minColor: '#c62828',
        maxColor: '#f5f5f5'
      },
      tooltip: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: function (this: any) {
          const monthLabel = months[this.point.x]
          const catLabel = cats[this.point.y]?.libelle ?? '-'
          const value = this.point.value
          if (value === null || value === undefined) {
            return `<b>${catLabel}</b><br/>${monthLabel}<br/>—`
          }
          return `<b>${catLabel}</b><br/>${monthLabel}<br/>${value} €`
        }
      },
      legend: {
        align: 'right',
        layout: 'vertical',
        margin: 0,
        verticalAlign: 'top',
        y: 25,
        symbolHeight: 280
      },
      series: [
        {
          type: 'heatmap',
          name: 'Dépenses',
          borderWidth: 1,
          data,
          dataLabels: { enabled: false },
          point: {
            events: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              click: function (this: any) {
                const monthIdx = this.x as number
                const catIdx = this.y as number
                const IDcat = cats[catIdx]?.IDcat
                if (typeof IDcat !== 'number') return
                selectedCellOp.value = { month: monthIdx, cat: IDcat }
                const year = props.year
                const month = monthIdx + 1
                store.dispatch('fetchOperations', {
                  IDcat,
                  and: [
                    { DateOp: { gte: new Date(`${year}-${month}-01 00:00:00Z`) } },
                    { DateOp: { lte: new Date(`${year}-${month}-${lastDayOfMonth(year, month)} 23:59:59Z`) } }
                  ]
                })
              }
            }
          }
        }
      ]
    } as Highcharts.Options)
  }

  watch(() => props.data, buildChart, { deep: true })
  onMounted(buildChart)
</script>

<style scoped>
  .category-heatmap__chart {
    width: 100%;
    height: 460px;
  }
  .category-heatmap__operation-list {
    margin-top: var(--spacing-md);
  }
</style>
