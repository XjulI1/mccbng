<template>
  <div>
    <div ref="chartEl" class="pie-by-categorie__chart" />
    <operation-list
      v-if="selectedCatId"
      class="pie-by-categorie__operation-list"
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

  const categoriesTotal = computed(
    () => store.getters.getCategoriesTotalForHighchartPie
  )
  const userID = computed(() => store.state.user.id)
  const storeCurrentYear = computed(() => store.state.stats.currentYear)
  const storeCurrentMonth = computed(() => store.state.stats.currentMonth)
  function lastDayOfMonth (year, month) {
    const lastDay = new Date(year, month, 0)
    return lastDay.getDate()
  }

  const buildChart = () => {
    Highcharts.chart(chartEl.value!, {
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
    store.commit('setOperationsOfActiveAccount', [])
  })

  watch(userID, () => {
    store.dispatch('fetchSumCategoriesByUserByMonth')
  })

  watch(selectedCatId, () => {
    store.dispatch('fetchOperations', {
      IDcat: selectedCatId.value,
      and: [
        {
          DateOp: {
            gte: new Date(
              storeCurrentYear.value +
                '-' +
                storeCurrentMonth.value +
                '-01 00:00:00Z'
            )
          }
        },
        {
          DateOp: {
            lte: new Date(
              storeCurrentYear.value +
                '-' +
                storeCurrentMonth.value +
                '-' +
                lastDayOfMonth(storeCurrentYear.value, storeCurrentMonth.value) +
                ' 23:59:59Z'
            )
          }
        }
      ]
    })
  })

  onMounted(() => {
    if (userID.value) {
      store.dispatch('fetchSumCategoriesByUserByMonth')
    }
  })
</script>
