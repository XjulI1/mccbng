<template>
  <div class="evolutionSoldes" />
</template>

<script setup>
  import { ref, computed, watch, getCurrentInstance } from 'vue'
  import { useStore } from 'vuex'
  import Highcharts from 'highcharts'
  import { fetchEvolutionSolde } from '@/services/stats'

  const store = useStore()
  const { proxy } = getCurrentInstance()

  let chart // Initialize chart variable

  const global = ref([])
  const dispo = ref([])
  const retraite = ref([])

  const userID = computed(() => store.state.user.id)
  const userToken = computed(() => store.state.user.token)
  const isZoom = computed(() => store.state.display.zoom_stats)

  const buildChart = () => {
    chart = Highcharts.chart(
      proxy.$el || proxy.$el.querySelector('.evolutionSoldes'),
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
            data: global.value
          },
          {
            type: 'area',
            name: 'Dispo',
            data: dispo.value
          },
          {
            type: 'area',
            name: 'Retraite',
            data: retraite.value
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

  watch(isZoom, (value) => {
    if (value) {
      const parentElement = proxy.$el.parentElement

      document.body.appendChild(proxy.$el)
      proxy.$el.classList.add('is-zoom')
      chart.reflow()

      const clickZoom = () => {
        parentElement.appendChild(proxy.$el)
        store.dispatch('toggleZoomStats', false)
        proxy.$el.classList.remove('is-zoom')

        setTimeout(() => {
          document.querySelector('#app').removeEventListener('click', clickZoom)
          chart.reflow()
        }, 100)
      }

      setTimeout(() => {
        document.querySelector('#app').addEventListener('click', clickZoom)
      }, 500)
    }
  })

  watch(userID, (value) => {
    fetchEvolutionSolde(
      value,
      userToken.value,
      import.meta.env.VITE_API_URL
    ).then((results) => {
      let sum = results.soldeGlobal
      global.value = results.global.map((data) => {
        sum += data.montant
        return [new Date(data.date).getTime(), Math.round(sum * 100) / 100]
      })

      sum = results.soldeDispo
      dispo.value = results.dispo.map((data) => {
        sum += data.montant
        return [new Date(data.date).getTime(), Math.round(sum * 100) / 100]
      })

      sum = results.soldeRetraite
      retraite.value = results.retraite.map((data) => {
        sum += data.montant
        return [new Date(data.date).getTime(), Math.round(sum * 100) / 100]
      })
      buildChart()
    })
  })
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
