<template>
  <div>
    <div class="pie-by-categorie__chart" />
    <operation-list
      v-if="selectedCatId"
      class="pie-by-categorie__operation-list"
      :OperationRenderer="OperationRenderer"
    />
  </div>
</template>

<script setup>
  import { ref, computed, watch, onMounted, getCurrentInstance } from 'vue'
  import { useStore } from 'vuex'
  import Highcharts from 'highcharts'
  import OperationList from '../OperationList.vue'
  import OperationRenderer from '../Home/Operation.vue'
  import { lastDayOfMonth } from '@/helpers/date'

  const store = useStore()
  const { proxy } = getCurrentInstance()

  const selectedCatId = ref(null)

  const categoriesTotal = computed(
    () => store.getters.getCategoriesTotalForHighchartPie
  )
  const userID = computed(() => store.state.user.id)
  const storeCurrentYear = computed(() => store.state.stats.currentYear)
  const storeCurrentMonth = computed(() => store.state.stats.currentMonth)

  const buildChart = () => {
    Highcharts.chart(proxy.$el.querySelector('.pie-by-categorie__chart'), {
      chart: {
        plotBackgroundColor: null,
        plotBorderWidth: null,
        plotShadow: false,
        type: 'pie'
      },
      credits: {
        enabled: false
      },
      title: {
        text: null
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
              color:
                (Highcharts.theme && Highcharts.theme.contrastTextColor) ||
                'black'
            }
          }
        },
        series: {
          point: {
            events: {
              click: function () {
                selectedCatId.value = this.catId
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
    })
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
