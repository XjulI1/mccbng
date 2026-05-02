<template>
  <div class="gestion-view">
    <div class="patrimoine-header">
      <div class="patrimoine-header-top">
        <span class="patrimoine-title">Patrimoine total</span>
      </div>
      <div class="patrimoine-balance">
        <Currency :amount="patrimoineTotal" />
      </div>
      <div
        v-if="biensCount > 0 || creditsCount > 0"
        class="patrimoine-meta"
      >
        {{ biensCount }} bien{{ biensCount > 1 ? 's' : '' }} ·
        {{ creditsCount }} crédit{{ creditsCount > 1 ? 's' : '' }}
      </div>
    </div>

    <div class="section-title">
      Mes outils
    </div>
    <div class="gestion-grid">
      <button
        type="button"
        class="gestion-card"
        @click="goTo('/biens')"
      >
        <div class="gestion-icon icon-bien">
          <font-awesome-icon icon="home" />
        </div>
        <div class="gestion-label">
          Biens
        </div>
        <div class="gestion-count">
          {{ biensCount }} bien{{ biensCount > 1 ? 's' : '' }}
        </div>
        <div
          v-if="totalBiens > 0"
          class="gestion-amount"
        >
          <Currency :amount="totalBiens" />
        </div>
      </button>

      <button
        type="button"
        class="gestion-card"
        @click="goTo('/credits')"
      >
        <div class="gestion-icon icon-credit">
          <font-awesome-icon icon="credit-card" />
        </div>
        <div class="gestion-label">
          Crédits
        </div>
        <div class="gestion-count">
          {{ creditsCount }} actif{{ creditsCount > 1 ? 's' : '' }}
        </div>
        <div
          v-if="totalCreditsRemaining > 0"
          class="gestion-amount neg"
        >
          <Currency :amount="-totalCreditsRemaining" />
        </div>
      </button>

      <button
        type="button"
        class="gestion-card"
        @click="goTo('/recurrOperation')"
      >
        <div class="gestion-icon icon-recur">
          <font-awesome-icon icon="retweet" />
        </div>
        <div class="gestion-label">
          Récurrentes
        </div>
        <div class="gestion-count">
          {{ recurringCount }} opération{{ recurringCount > 1 ? 's' : '' }}
        </div>
      </button>

      <button
        type="button"
        class="gestion-card"
        @click="goTo('/amortissement')"
      >
        <div class="gestion-icon icon-amort">
          <font-awesome-icon icon="history" />
        </div>
        <div class="gestion-label">
          Coûts d'usage
        </div>
        <div class="gestion-count">
          Suivi des achats
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useStore } from 'vuex'
  import Currency from '@/components/Currency.vue'

  const store = useStore()
  const router = useRouter()

  const biens = computed(() => store.state.bien.bienList || [])
  const credits = computed(() => store.state.credit.creditList || [])
  const creditBalances = computed(() => store.state.credit.creditBalances || {})
  const recurringOperations = computed(
    () => store.state.operation.recurringOperations || []
  )

  const biensCount = computed(() => biens.value.length)
  const creditsCount = computed(() => credits.value.length)
  const recurringCount = computed(() => recurringOperations.value.length)

  const totalBiens = computed(() =>
    biens.value.reduce((sum, b) => {
      const value =
        b.ValeurActuelle ??
        (b.PrixBienNu || 0) + (b.FraisNotaire || 0) + (b.FraisAgence || 0)
      return sum + value
    }, 0)
  )

  const totalCreditsRemaining = computed(() =>
    credits.value.reduce((sum, c) => {
      const balance = creditBalances.value[c.IDcredit]
      return sum + (balance?.solde ?? c.MontantInitial ?? 0)
    }, 0)
  )

  const patrimoineTotal = computed(
    () => totalBiens.value - totalCreditsRemaining.value
  )

  const goTo = (path: string) => {
    router.push(path)
  }

  onMounted(() => {
    store.commit('setActiveAccount', { NomCompte: 'Gestion' })
    store.dispatch('fetchBiens')
    store.dispatch('fetchCredits')
    store.dispatch('fetchRecurrOperation')
  })
</script>

<style lang="scss" scoped>
.gestion-view {
  min-height: calc(100vh - #{$header-height-and-margin});
  padding: 0 16px calc(#{$navbar-height-and-margin} + 24px);
  max-width: 960px;
  margin: 0 auto;
}

.patrimoine-header {
  background: var(--primary-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%));
  color: #fff;
  border-radius: 16px;
  padding: 20px 24px;
  margin-top: 8px;
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.1));
}

.patrimoine-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 14px;
  opacity: 0.9;
}

.patrimoine-balance {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.patrimoine-meta {
  font-size: 12px;
  opacity: 0.85;
  margin-top: 6px;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary, #4a5568);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 20px 4px 10px;
}

.gestion-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (min-width: $desktop_BP_min_width) {
  .gestion-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
}

.gestion-card {
  background: var(--bg-card, #fff);
  border: var(--card-border, 1px solid rgba(0, 0, 0, 0.05));
  border-radius: 16px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.06));
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  text-align: center;
  font: inherit;
  color: inherit;
}

.gestion-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md, 0 8px 16px rgba(0, 0, 0, 0.1));
}

.gestion-card:active {
  transform: translateY(0);
}

.gestion-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 22px;
  margin-bottom: 6px;
}

.icon-bien { background: linear-gradient(135deg, #e83e8c 0%, #c42a60 100%); }
.icon-credit { background: linear-gradient(135deg, #6f42c1 0%, #4e2a8e 100%); }
.icon-recur { background: linear-gradient(135deg, #17a2b8 0%, #117a8b 100%); }
.icon-amort { background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); }

.gestion-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #2d3748);
}

.gestion-count {
  font-size: 12px;
  color: var(--text-secondary, #a0aec0);
}

.gestion-amount {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary, #2d3748);
  margin-top: 4px;
}

.gestion-amount.neg {
  color: #e53e3e;
}
</style>
