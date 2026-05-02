<template>
  <div class="biens-view">
    <router-view />

    <div
      v-if="biensList.length > 0"
      class="summary-cards"
    >
      <div class="summary-card">
        <span class="summary-label">Nombre de biens</span>
        <span class="summary-value">{{ biensList.length }}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Investissement total</span>
        <span class="summary-value">{{ formatAmount(totalInvestissement) }}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Valeur estimée</span>
        <span class="summary-value">{{ formatAmount(totalValeurActuelle) }}</span>
      </div>
    </div>

    <BienList />
  </div>
</template>

<script setup>
  import { computed, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import BienList from '@/components/BienList.vue'

  const store = useStore()

  const biensList = computed(() => store.state.bien.bienList || [])

  const totalInvestissement = computed(() => {
    return biensList.value.reduce((sum, bien) => {
      return (
        sum +
        (bien.PrixBienNu || 0) +
        (bien.FraisNotaire || 0) +
        (bien.FraisAgence || 0)
      )
    }, 0)
  })

  const totalValeurActuelle = computed(() => {
    return biensList.value.reduce((sum, bien) => {
      const value =
        bien.ValeurActuelle ||
        (bien.PrixBienNu || 0) +
        (bien.FraisNotaire || 0) +
        (bien.FraisAgence || 0)
      return sum + value
    }, 0)
  })

  const formatAmount = (amount) => {
    if (amount === undefined || amount === null) return '0,00 €'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  onMounted(() => {
    store.dispatch('fetchBiens')
    store.dispatch('fetchCredits')
    store.commit('setActiveAccount', { NomCompte: 'Mes biens' })
  })
</script>

<style lang="scss" scoped>
.biens-view {
  min-height: 100vh;
  background: var(--bg-primary, #f5f5f5);
  padding-bottom: 5rem;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  max-width: 800px;
  margin: 1rem auto;
  padding: 0 1rem;
}

.summary-card {
  background: var(--primary-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%));
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
}

.summary-card:nth-child(2) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.summary-card:nth-child(3) {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.summary-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
}

@media (max-width: 768px) {
  .summary-cards {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .summary-card {
    padding: 1rem;
  }

  .summary-value {
    font-size: 1.25rem;
  }
}
</style>
