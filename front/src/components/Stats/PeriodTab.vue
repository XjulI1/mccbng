<template>
  <div class="period-tab">
    <PeriodPicker
      :from="from"
      :to="to"
      @change="onRangeChange"
    />

    <section class="period-tab__card">
      <h4>Top catégories de dépense</h4>
      <TopCategories
        :items="topCategories"
        :from="from"
        :to="to"
      />
    </section>

    <section class="period-tab__card">
      <h4>Plus grosses opérations de la période</h4>
      <TopOperations :items="topOperations" />
    </section>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import {
    fetchTopCategories,
    fetchTopOperations
  } from '@/services/stats'
  import PeriodPicker from './PeriodPicker.vue'
  import TopCategories from './TopCategories.vue'
  import TopOperations from './TopOperations.vue'

  const store = useStore()

  const today = new Date()
  const startOfYear = new Date(today.getFullYear(), 0, 1)
  const toISO = (d: Date) => d.toISOString().slice(0, 10)

  const from = ref(toISO(startOfYear))
  const to = ref(toISO(today))
  const limit = 10

  const topCategories = ref<{ IDcat: number; libelle: string; total: number }[]>(
    []
  )
  const topOperations = ref<{
    IDop: number
    NomOp: string
    MontantOp: number
    DateOp: string
    IDcat: number
  }[]>([])

  const reload = async () => {
    const token = store.state.user.token
    const apiUrl = window.env.VITE_API_URL
    const [cats, ops] = await Promise.all([
      fetchTopCategories(from.value, to.value, limit, token, apiUrl),
      fetchTopOperations(from.value, to.value, limit, token, apiUrl)
    ])
    topCategories.value = cats
    topOperations.value = ops
  }

  const onRangeChange = (range: { from: string; to: string }) => {
    from.value = range.from
    to.value = range.to
    reload()
  }

  onMounted(() => {
    store.dispatch('fetchCategoryList')
    if (store.state.user.id) reload()
  })
</script>

<style scoped>
  .period-tab__card {
    margin: 10px;
    background: var(--bg-card);
    padding: var(--spacing-lg);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-color);
  }
  .period-tab__card h4 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
  }
</style>
