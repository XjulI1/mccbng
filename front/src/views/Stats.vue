<template>
  <div class="stats-view">
    <div class="stats-view__tabs">
      <button
        type="button"
        class="tab"
        :class="{ active: activeTab === 'monthly' }"
        @click="setTab('monthly')"
      >
        Mensuel
      </button>
      <button
        type="button"
        class="tab"
        :class="{ active: activeTab === 'comparisons' }"
        @click="setTab('comparisons')"
      >
        Comparaisons
      </button>
    </div>

    <div v-if="activeTab === 'monthly'">
      <TimeSeriesEvolutionSoldes />
      <SumByMonth />
      <PieByCategorie />
    </div>

    <div v-else>
      <PeriodPicker />
      <YearComparison />
      <div class="stats-view__row">
        <IncomeVsExpense class="stats-view__half" />
        <SavingsRateChart class="stats-view__half" />
      </div>
      <TopCategories />
      <CategoryHeatmap />
      <TopOperations />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import SumByMonth from '@/components/Stats/SumByMonth.vue'
  import PieByCategorie from '@/components/Stats/PieByCategorie.vue'
  import TimeSeriesEvolutionSoldes from '@/components/Stats/TimeSeriesEvolutionSoldes.vue'
  import PeriodPicker from '@/components/Stats/PeriodPicker.vue'
  import YearComparison from '@/components/Stats/YearComparison.vue'
  import TopCategories from '@/components/Stats/TopCategories.vue'
  import IncomeVsExpense from '@/components/Stats/IncomeVsExpense.vue'
  import SavingsRateChart from '@/components/Stats/SavingsRateChart.vue'
  import TopOperations from '@/components/Stats/TopOperations.vue'
  import CategoryHeatmap from '@/components/Stats/CategoryHeatmap.vue'

  const store = useStore()

  const TAB_KEY = 'stats.activeTab'
  const activeTab = ref<'monthly' | 'comparisons'>(
    (localStorage.getItem(TAB_KEY) as 'monthly' | 'comparisons') ?? 'monthly'
  )

  const setTab = (tab: 'monthly' | 'comparisons') => {
    activeTab.value = tab
    localStorage.setItem(TAB_KEY, tab)
  }

  onMounted(() => {
    store.commit('setActiveAccount', { NomCompte: 'Stats' })
  })
</script>

<style scoped>
  .stats-view__tabs {
    display: flex;
    gap: var(--spacing-sm);
    margin: 10px;
  }
  .tab {
    flex: 1;
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    color: var(--text-primary);
    cursor: pointer;
    font-weight: var(--font-weight-medium);
    transition: all var(--transition-normal);
  }
  .tab:hover {
    background: var(--bg-muted);
  }
  .tab.active {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }
  .stats-view__row {
    display: flex;
    flex-wrap: wrap;
    gap: 0;
  }
  .stats-view__half {
    flex: 1 1 320px;
  }
</style>
