<template>
  <div class="comparison-tab">
    <div class="comparison-tab__filter">
      <label>
        Année A
        <select
          v-model.number="yearA"
        >
          <option
            v-for="y in availableYears"
            :key="'a-' + y"
            :value="y"
          >
            {{ y }}
          </option>
        </select>
      </label>
      <label>
        Année B
        <select
          v-model.number="yearB"
        >
          <option
            v-for="y in availableYears"
            :key="'b-' + y"
            :value="y"
          >
            {{ y }}
          </option>
        </select>
      </label>
    </div>

    <section class="comparison-tab__card">
      <h4>Comparaison année / année</h4>
      <YearComparison
        :year-a="yearA"
        :year-b="yearB"
        :data="data"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import { fetchYearComparison } from '@/services/stats'
  import YearComparison from './YearComparison.vue'

  const store = useStore()

  const currentYear = new Date().getFullYear()
  const yearA = ref(currentYear - 1)
  const yearB = ref(currentYear)

  const availableYears = computed(() =>
    [...Array(currentYear - 2016).keys()].map((k) => k + 2017)
  )

  const data = ref<{
    yearA: number[]
    yearB: number[]
    deltaPct:(number | null)[]
  }>({ yearA: [], yearB: [], deltaPct: [] })

  const reload = async () => {
    const token = store.state.user.token
    data.value = await fetchYearComparison(
      yearA.value,
      yearB.value,
      token,
      window.env.VITE_API_URL
    )
  }

  watch([yearA, yearB], reload)

  onMounted(() => {
    if (store.state.user.id) reload()
  })
</script>

<style scoped>
  .comparison-tab__filter {
    margin: 10px;
    color: var(--text-primary);
    display: flex;
    gap: var(--spacing-md);
    flex-wrap: wrap;
  }
  .comparison-tab__filter select {
    margin-left: var(--spacing-sm);
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
  }
  .comparison-tab__card {
    margin: 10px;
    background: var(--bg-card);
    padding: var(--spacing-lg);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
  }
  .comparison-tab__card h4 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
  }
</style>
