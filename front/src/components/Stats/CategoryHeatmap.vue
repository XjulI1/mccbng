<template>
  <div class="category-heatmap">
    <div class="category-heatmap__header">
      <h4>Heatmap mois × catégorie</h4>
      <label>
        Année
        <select
          :value="heatmapYear"
          @change="onYearChange"
        >
          <option
            v-for="y in availableYears"
            :key="'h-' + y"
            :value="y"
          >
            {{ y }}
          </option>
        </select>
      </label>
    </div>
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
  import { ref, computed, watch, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import Highcharts from 'highcharts'
  import 'highcharts/modules/heatmap'
  import OperationList from '../OperationList.vue'
  import OperationRenderer from '../Home/Operation.vue'

  const store = useStore()
  const chartEl = ref<HTMLElement | null>(null)
  const selectedCellOp = ref<{ month: number; cat: number } | null>(null)

  const heatmapData = computed(() => store.state.stats.categoryHeatmap)
  const heatmapYear = computed(() => store.state.stats.heatmapYear)
  const userID = computed(() => store.state.user.id)

  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  const currentYear = new Date().getFullYear()
  const availableYears = computed(() =>
    [...Array(currentYear - 2016).keys()].map((k) => k + 2017)
  )

  const onYearChange = (e: Event) => {
    store.dispatch(
      'changeHeatmapYear',
      parseInt((e.target as HTMLInputElement).value)
    )
  }

  const lastDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 0).getDate()

  const buildChart = () => {
    if (!chartEl.value) return
    const cats = heatmapData.value?.categories ?? []
    const data = heatmapData.value?.data ?? []

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
        categories: cats.map((c: any) => c.libelle),
        title: { text: undefined },
        reversed: true
      },
      colorAxis: {
        min: Math.min(...data.map((d: number[]) => d[2]), 0),
        max: 0,
        minColor: '#c62828',
        maxColor: '#f5f5f5'
      },
      tooltip: {
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
              click: function (this: any) {
                const monthIdx = this.x as number
                const catIdx = this.y as number
                const IDcat = cats[catIdx]?.IDcat
                if (typeof IDcat !== 'number') return
                selectedCellOp.value = { month: monthIdx, cat: IDcat }
                const year = heatmapYear.value
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

  watch(heatmapData, buildChart)
  watch(userID, () => store.dispatch('fetchCategoryHeatmap'))

  onMounted(() => {
    if (userID.value) store.dispatch('fetchCategoryHeatmap')
    buildChart()
  })
</script>

<style scoped>
  .category-heatmap {
    margin: 10px;
    background: var(--bg-card);
    padding: var(--spacing-lg);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
  }
  .category-heatmap__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
    color: var(--text-primary);
  }
  .category-heatmap__header h4 {
    margin: 0;
  }
  .category-heatmap__header select {
    margin-left: var(--spacing-sm);
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
  }
  .category-heatmap__chart {
    width: 100%;
    height: 460px;
  }
  .category-heatmap__operation-list {
    margin-top: var(--spacing-md);
  }
</style>
