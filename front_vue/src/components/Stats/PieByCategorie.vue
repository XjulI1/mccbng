<template>
  <div/>
</template>

<script>
  import Highcharts from 'highcharts'
  import { mapGetters, mapState } from 'vuex'

  export default {
    name: 'PieByCategorie',

    computed: {
      ...mapGetters({ categoriesTotal: 'getCategoriesTotalForHighchartPie' }),
      ...mapState({ userID: state => state.user.id })
    },

    watch: {
      categoriesTotal () {
        this.buildChart()
      },

      userID () {
        this.$store.dispatch('fetchSumCategoriesByUserByMonth')
      }
    },

    created () {
      if (this.$store.state.user.id) {
        this.$store.dispatch('fetchSumCategoriesByUserByMonth')
      }
    },

    methods: {
      buildChart () {
        Highcharts.chart(this.$el, {
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
                  color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
                }
              }
            }
          },
          series: [{
            colorByPoint: true,
            name: 'Total',
            data: this.categoriesTotal
          }]
        })
      }
    }
  }
</script>
