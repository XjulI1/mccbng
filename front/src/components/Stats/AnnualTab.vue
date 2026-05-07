<template>
  <div class="annual-tab">
    <div class="annual-tab__filter">
      <label>
        Année
        <select
          v-model.number="year"
        >
          <option
            v-for="y in availableYears"
            :key="y"
            :value="y"
          >
            {{ y }}
          </option>
        </select>
      </label>
    </div>

    <section class="annual-tab__card">
      <h4>Évolution du solde</h4>
      <TimeSeriesEvolutionSoldes :year="year" />
    </section>

    <div class="annual-tab__row">
      <section class="annual-tab__card half">
        <h4>Revenus vs dépenses ({{ year }})</h4>
        <IncomeVsExpense :data="incomeData" />
      </section>
      <section class="annual-tab__card half">
        <h4>Taux d'épargne ({{ year }})</h4>
        <SavingsRateChart :rates="rates" />
      </section>
    </div>

    <section class="annual-tab__card">
      <h4>Heatmap mois × catégorie ({{ year }})</h4>
      <CategoryHeatmap
        :year="year"
        :data="heatmapData"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import {
    fetchIncomeVsExpense,
    fetchCategoryHeatmap
  } from '@/services/stats'
  import TimeSeriesEvolutionSoldes from './TimeSeriesEvolutionSoldes.vue'
  import IncomeVsExpense from './IncomeVsExpense.vue'
  import SavingsRateChart from './SavingsRateChart.vue'
  import CategoryHeatmap from './CategoryHeatmap.vue'

  const store = useStore()

  const year = ref(new Date().getFullYear())

  const availableYears = computed(() =>
    [...Array(new Date().getFullYear() - 2016).keys()].map((k) => k + 2017)
  )

  const incomeData = ref<{ income: number[]; expense: number[] }>({
    income: [], expense: []
  })
  const heatmapData = ref<{
    categories: { IDcat: number; libelle: string }[]
    data: [number, number, number][]
  }>({ categories: [], data: [] })

  const rates = computed<(number | null)[]>(() => {
    const { income, expense } = incomeData.value
    if (!income || income.length === 0) return []
    return income.map((inc, i) => {
      if (!inc) return null
      const exp = Math.abs(expense[i] ?? 0)
      return Math.round(((inc - exp) / inc) * 10000) / 100
    })
  })

  const reload = async () => {
    const token = store.state.user.token
    const apiUrl = window.env.VITE_API_URL
    const [income, heatmap] = await Promise.all([
      fetchIncomeVsExpense(year.value, token, apiUrl),
      fetchCategoryHeatmap(year.value, token, apiUrl)
    ])
    incomeData.value = income
    heatmapData.value = heatmap
  }

  watch(year, reload)

  onMounted(() => {
    store.dispatch('fetchCategoryList')
    if (store.state.user.id) reload()
  })
</script>

<style scoped>
  .annual-tab {
    display: flex;
    flex-direction: column;
  }
  .annual-tab__filter {
    margin: 10px;
    color: var(--text-primary);
  }
  .annual-tab__filter select {
    margin-left: var(--spacing-sm);
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
  }
  .annual-tab__card {
    margin: 10px;
    background: var(--bg-card);
    padding: var(--spacing-lg);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
  }
  .annual-tab__card h4 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
  }
  .annual-tab__row {
    display: flex;
    flex-wrap: wrap;
  }
  .annual-tab__row .half {
    flex: 1 1 320px;
  }
</style>
