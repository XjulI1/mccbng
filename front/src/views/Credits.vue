<template>
  <div class="credits-view">
    <router-view />

    <div
      v-if="creditsList.length > 0"
      class="summary-cards"
    >
      <div class="summary-card">
        <span class="summary-label">Total emprunté</span>
        <span class="summary-value">{{ formatAmount(totalInitial) }}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Total restant</span>
        <span class="summary-value montant-negatif">{{
          formatAmount(totalRemaining)
        }}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Mensualités totales</span>
        <span class="summary-value">{{ formatAmount(totalMonthly) }}</span>
      </div>
    </div>

    <CreditList />
  </div>
</template>

<script setup>
  import { computed, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import CreditList from '@/components/CreditList.vue'

  const store = useStore()

  const creditsList = computed(() => store.state.credit.creditList || [])
  const creditBalances = computed(() => store.state.credit.creditBalances || {})

  const totalInitial = computed(() => {
    return creditsList.value.reduce(
      (sum, credit) => sum + (credit.MontantInitial || 0),
      0
    )
  })

  const totalRemaining = computed(() => {
    return creditsList.value.reduce((sum, credit) => {
      const balance = creditBalances.value[credit.IDcredit]
      return sum + (balance?.solde || credit.MontantInitial || 0)
    }, 0)
  })

  const totalMonthly = computed(() => {
    return Math.abs(
      creditsList.value.reduce(
        (sum, credit) => sum + (credit.MontantMensuel || 0),
        0
      )
    )
  })

  const formatAmount = (amount) => {
    if (amount === undefined || amount === null) return '0,00 €'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  onMounted(() => {
    store.dispatch('fetchCredits')
    store.commit('setActiveAccount', { NomCompte: 'Mes crédits' })
  })
</script>

<style lang="scss" scoped>
.credits-view {
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
  background: linear-gradient(
    135deg,
    var(--primary-gradient, #667eea 0%, #764ba2 100%)
  );
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
}

.summary-card:nth-child(2) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.summary-card:nth-child(3) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
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
