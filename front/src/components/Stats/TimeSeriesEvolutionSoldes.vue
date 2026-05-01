<template>
  <div ref="chartEl" class="evolutionSoldes" />
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useStore } from 'vuex'
  import Highcharts from 'highcharts'
  import { fetchEvolutionSolde } from '@/services/stats'

  const store = useStore()
  const chartEl = ref<HTMLElement | null>(null)

  let chart // Initialize chart variable

  const global = ref([])
  const dispo = ref([])
  const retraite = ref([])

  const userToken = computed(() => store.state.user.token)

  const buildChart = () => {
    chart = Highcharts.chart(
      chartEl.value! as HTMLElement,
      {
        chart: {
          zooming: { type: 'x' }
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
                [0, (Highcharts.getOptions().colors ?? [])[0]],
                [
                  1,
                  new Highcharts.Color((Highcharts.getOptions().colors ?? [])[0])
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
      } as Highcharts.Options
    )

    chart.xAxis[0].setExtremes(
      Date.UTC(new Date().getFullYear(), 0, 1),
      Date.UTC(new Date().getFullYear(), 11, 31)
    )

    if (!chart.resetZoomButton) {
      chart.showResetZoom()
    }
  }

  fetchEvolutionSolde(
    userToken.value,
    window.env.VITE_API_URL
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
  z-index: var(--z-modal);
  border: 2px solid var(--border-color);
  background: var(--bg-card);
  box-shadow: var(--shadow-xl);
  border-radius: var(--radius-lg);
}
</style>
