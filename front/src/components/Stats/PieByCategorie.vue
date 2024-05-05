<template>
  <div>
    <div class="pie-by-categorie__chart" />
    <operation-list v-if="selectedCatId" />
  </div>
</template>

<script>
  import Highcharts from 'highcharts'
  import { mapGetters, mapState } from 'vuex'
  import OperationList from '../OperationList.vue'
  import { lastDayOfMonth } from '@/helpers/date'

  let currentVueComponent

  export default {
    name: 'PieByCategorie',
    components: { OperationList },
    data () {
      return {
        selectedCatId: null
      }
    },

    computed: {
      ...mapGetters({ categoriesTotal: 'getCategoriesTotalForHighchartPie' }),
      ...mapState({
        userID: (state) => state.user.id,
        storeCurrentYear: (state) => state.stats.currentYear,
        storeCurrentMonth: (state) => state.stats.currentMonth
      })
    },

    watch: {
      categoriesTotal () {
        this.buildChart()
        this.$store.commit('setOperationsOfActiveAccount', [])
      },

      userID () {
        this.$store.dispatch('fetchSumCategoriesByUserByMonth')
      },
      selectedCatId () {
        this.$store.dispatch('fetchOperations', {
          IDcat: this.selectedCatId,
          and: [
            {
              DateOp: {
                gte: new Date(
                  this.storeCurrentYear +
                    '-' +
                    this.storeCurrentMonth +
                    '-01 00:00:00Z'
                )
              }
            },
            {
              DateOp: {
                lte: new Date(
                  this.storeCurrentYear +
                    '-' +
                    this.storeCurrentMonth +
                    '-' +
                    lastDayOfMonth(
                      this.storeCurrentYear,
                      this.storeCurrentMonth
                    ) +
                    ' 23:59:59Z'
                )
              }
            }
          ]
        })
      }
    },

    created () {
      if (this.userID) {
        this.$store.dispatch('fetchSumCategoriesByUserByMonth')
      }
    },

    mounted () {
      currentVueComponent = this
    },

    methods: {
      buildChart () {
        Highcharts.chart(this.$el.querySelector('.pie-by-categorie__chart'), {
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
                    currentVueComponent.selectedCatId = this.catId
                  }
                }
              }
            }
          },
          series: [
            {
              colorByPoint: true,
              name: 'Total',
              data: this.categoriesTotal
            }
          ]
        })
      }
    }
  }
</script>
