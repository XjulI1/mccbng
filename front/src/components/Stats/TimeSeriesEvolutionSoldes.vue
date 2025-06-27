<template>
  <div class="evolutionSoldes" />
</template>

<script>
  import Highcharts from 'highcharts'
  import { mapState } from 'vuex'
  import { fetchEvolutionSolde } from '@/services/stats'

  let chart // Initialize chart variable

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
        userToken: (state) => state.user.token,
        isZoom: (state) => state.display.zoom_stats
      })
    },

    watch: {
      isZoom (value) {
        if (value) {
          const parentElement = this.$el.parentElement

          document.body.appendChild(this.$el)
          this.$el.classList.add('is-zoom')
          chart.reflow()

          const clickZoom = () => {
            parentElement.appendChild(this.$el)
            this.$store.dispatch('toggleZoomStats', false)
            this.$el.classList.remove('is-zoom')

            setTimeout(() => {
              document
                .querySelector('#app')
                .removeEventListener('click', clickZoom)
              chart.reflow()
            }, 100)
          }

          setTimeout(() => {
            document.querySelector('#app').addEventListener('click', clickZoom)
          }, 500)
        }
      },
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
        chart = Highcharts.chart(
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

<style scoped>
.evolutionSoldes {
  width: 100%;
  height: 400px;
}
.is-zoom {
  position: fixed;
  top: 10%;
  left: 10%;
  width: 80%;
  height: 80%;
  z-index: 1000;
  border: 2px solid #ccc;
}
</style>
