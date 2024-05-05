<template>
  <div class="evolutionSoldes" />
</template>

<script>
  import Highcharts from 'highcharts'
  import { mapState } from 'vuex'
  import { fetchEvolutionSolde } from '@/services/stats'

  export default {
    name: 'TimeSeriesEvolutionSoldes',

    data () {
      return {
        global: [],
        dispo: [],
        retraite: []
      }
    },

    computed: {
      ...mapState({
        userID: (state) => state.user.id,
        userToken: (state) => state.user.token
      })
    },

    watch: {
      userID (value) {
        fetchEvolutionSolde(
          value,
          this.userToken,
          process.env.VUE_APP_API_URL
        ).then((results) => {
          let sum = results.soldeGlobal
          this.global = results.global.map((data) => {
            sum += data.montant
            return [new Date(data.date).getTime(), Math.round(sum * 100) / 100]
          })

          sum = results.soldeDispo
          this.dispo = results.dispo.map((data) => {
            sum += data.montant
            return [new Date(data.date).getTime(), Math.round(sum * 100) / 100]
          })

          sum = results.soldeRetraite
          this.retraite = results.retraite.map((data) => {
            sum += data.montant
            return [new Date(data.date).getTime(), Math.round(sum * 100) / 100]
          })
          this.buildChart()
        })
      }
    },

    methods: {
      buildChart () {
        const chart = Highcharts.chart(
          this.$el || this.$el.querySelector('.evolutionSoldes'),
          {
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
                    [
                      1,
                      Highcharts.Color(Highcharts.getOptions().colors[0])
                        .setOpacity(0)
                        .get('rgba')
                    ]
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
              headerFormat:
                '<span style="font-size: 10px">{point.key:%d-%m-%Y}</span><br/>',
              pointFormat:
                '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>{point.y} €</b><br/>'
            },
            series: [
              {
                type: 'area',
                name: 'Global',
                data: this.global
              },
              {
                type: 'area',
                name: 'Dispo',
                data: this.dispo
              },
              {
                type: 'area',
                name: 'Retraite',
                data: this.retraite
              }
            ]
          }
        )

        chart.xAxis[0].setExtremes(
          Date.UTC(new Date().getFullYear(), 0, 1),
          Date.UTC(new Date().getFullYear(), 11, 31)
        )

        if (!chart.resetZoomButton) {
          chart.showResetZoom()
        }
      }
    }
  }
</script>
