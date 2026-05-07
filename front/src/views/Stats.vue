<template>
  <div class="stats-view">
    <div class="stats-view__tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <component :is="currentTabComponent" />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import MonthlyTab from '@/components/Stats/MonthlyTab.vue'
  import AnnualTab from '@/components/Stats/AnnualTab.vue'
  import ComparisonTab from '@/components/Stats/ComparisonTab.vue'
  import PeriodTab from '@/components/Stats/PeriodTab.vue'

  type TabId = 'monthly' | 'annual' | 'comparison' | 'period'

  const store = useStore()

  const tabs: { id: TabId; label: string }[] = [
    { id: 'monthly', label: 'Mensuel' },
    { id: 'annual', label: 'Annuel' },
    { id: 'comparison', label: 'Comparaison' },
    { id: 'period', label: 'Période libre' }
  ]

  const activeTab = ref<TabId>('monthly')

  const currentTabComponent = computed(() => {
    switch (activeTab.value) {
    case 'annual': return AnnualTab
    case 'comparison': return ComparisonTab
    case 'period': return PeriodTab
    default: return MonthlyTab
    }
  })

  onMounted(() => {
    store.commit('setActiveAccount', { NomCompte: 'Stats' })
  })
</script>

<style scoped>
  .stats-view__tabs {
    display: flex;
    gap: var(--spacing-sm);
    margin: 10px;
    flex-wrap: wrap;
  }
  .tab {
    flex: 1 1 80px;
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
</style>
