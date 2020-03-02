<template>
  <div class="evolutionSoldes">
  </div>
</template>

<script>
  import Highcharts from 'highcharts'
  import { mapState } from 'vuex'
  import axios from 'axios/index'

  export default {
    name: 'TimeSeriesEvolutionSoldes',

    computed: {
      ...mapState({ userID: state => state.user.id })
    },

    watch: {
      userID (value) {
        axios.get(process.env.VUE_APP_API_URL + '/api/stats/evolutionSolde', {
          params: {
            access_token: this.$store.state.user.token,
            userID: value
          }
        }).then((response) => {
          let sum = response.data.results.soldeTotal
          this.total = response.data.results.total
            .map((data) => {
              sum += data.montant
              return [new Date(data.date), Math.round(sum * 100) / 100]
            })

          sum = response.data.results.soldeDispo
          this.dispo = response.data.results.dispo
            .map((data) => {
              sum += data.montant
              return [new Date(data.date), Math.round(sum * 100) / 100]
            })
          this.buildChart()
        })
      }
    },

    data () {
      return {
        total: [],
        dispo: []
      }
    },

    methods: {
      buildChart () {
        const chart = Highcharts.chart(this.$el || this.$el.querySelector('.evolutionSoldes'), {
          chart: {
            zoomType: 'x'
          },
          title: {
            text: 'Evolution du solde'
          },
          credits: {
            enabled: false
          },
          xAxis: {
            type: 'datetime'
          },
          yAxis: {
            title: {
              text: ''
            }
          },
          legend: {
            enabled: false
          },
          plotOptions: {
            area: {
              fillColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                  [0, Highcharts.getOptions().colors[0]],
                  [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                ]
              },
              marker: {
                radius: 2
              },
              lineWidth: 1,
              states: {
                hover: {
                  lineWidth: 1
                }
              },
              threshold: null
            }
          },
          tooltip: {
            headerFormat: '<span style="font-size: 10px">{point.key:%d-%m-%Y}</span><br/>',
            pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>{point.y} €</b><br/>'
          },
          series: [{
            type: 'area',
            name: 'Total',
            data: this.total
          }, {
            type: 'area',
            name: 'Disponible',
            data: this.dispo
          }]
        })

        chart.xAxis[0].setExtremes(
          Date.UTC((new Date()).getFullYear(), 0, 1),
          Date.UTC((new Date()).getFullYear(), 11, 31)
        )

        if (!chart.resetZoomButton) {
          chart.showResetZoom()
        }
      }
    }
  }
</script>

<style scoped>

</style>
