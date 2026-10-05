<template>
  <div>
    <div ref="chartEl" class="pie-by-categorie__chart" />
    <operation-list
      v-if="selectedCatId"
      class="pie-by-categorie__operation-list"
      :OperationRenderer="OperationRenderer"
      :read-only="true"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { useOperationStore } from '@/stores/operation'
  import { useStatsStore } from '@/stores/stats'
  import { useUserStore } from '@/stores/user'
  import { dateOpWithin, monthRange } from '@/utils/dates'
  import Highcharts from 'highcharts'
  import OperationList from '../OperationList.vue'
  import OperationRenderer from '../Home/Operation.vue'

  const operationStore = useOperationStore()
  const statsStore = useStatsStore()
  const userStore = useUserStore()
  const chartEl = ref<HTMLElement | null>(null)

  const selectedCatId = ref<number | null>(null)

  const categoriesTotal = computed(
    () => statsStore.getCategoriesTotalForHighchartPie
  )
  const userID = computed(() => userStore.id)
  const storeCurrentYear = computed(() => statsStore.currentYear)
  const storeCurrentMonth = computed(() => statsStore.currentMonth)

  const buildChart = () => {
    Highcharts.chart(chartEl.value! as HTMLElement, {
      chart: {
        plotBackgroundColor: undefined,
        plotBorderWidth: undefined,
        plotShadow: false,
        type: 'pie'
      },
      credits: {
        enabled: false
      },
      title: {
        text: undefined
      },
      tooltip: {
        pointFormat: '{series.name}: <b>{point.y}€</b>'
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.percentage:.1f} %',
            style: {
              color: 'black'
            }
          }
        },
        series: {
          point: {
            events: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              click: function (this: Highcharts.Point) {
                selectedCatId.value = (this as any).catId
              }
            }
          }
        }
      },
      series: [
        {
          colorByPoint: true,
          name: 'Total',
          data: categoriesTotal.value
        }
      ]
    } as unknown as Highcharts.Options)
  }

  watch(categoriesTotal, () => {
    buildChart()
    operationStore.setOperationsOfActiveAccount([])
  })

  watch(userID, () => {
    statsStore.fetchSumCategoriesByUserByMonth()
  })

  watch(selectedCatId, () => {
    operationStore.fetchOperations({
      IDcat: selectedCatId.value,
      and: dateOpWithin(monthRange(storeCurrentYear.value, storeCurrentMonth.value))
    })
  })

  onMounted(() => {
    if (userID.value) {
      statsStore.fetchSumCategoriesByUserByMonth()
    }
  })
</script>
