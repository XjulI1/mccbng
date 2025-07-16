<template>
  <div class="compte-list-compact">
    <!-- Section Comptes Disponibles -->
    <div class="section-compact">
      <div class="section-header">
        <span class="section-title">💳 Disponibles</span>
        <div class="section-total">
          <Currency :amount="totalAvailable" />
        </div>
      </div>
      <div class="accounts-row">
        <compte
          v-for="account in availableCompte"
          :key="'account-' + account.IDcompte"
          :account-informations="account"
          fa-icon="check"
          compact-mode="true"
        />
        <compte
          v-for="account in porteFeuilleCompte"
          :key="'account-' + account.IDcompte"
          :account-informations="account"
          fa-icon="money-bill"
          compact-mode="true"
        />
      </div>
    </div>

    <!-- Section Comptes Joint -->
    <div
      v-if="jointCompte.length > 0"
      class="section-compact"
    >
      <div class="section-header">
        <span class="section-title">🤝 Joint</span>
        <div class="section-total">
          <Currency :amount="totalJoint" />
        </div>
      </div>
      <div class="accounts-row">
        <compte
          v-for="account in jointCompte"
          :key="'account-' + account.IDcompte"
          :account-informations="account"
          fa-icon="handshake"
          compact-mode="true"
        />
      </div>
    </div>

    <!-- Section Comptes Bloqués -->
    <div
      v-if="bloquedCompte.length > 0"
      class="section-compact"
    >
      <div class="section-header">
        <span class="section-title">🔒 Bloqués</span>
        <div class="section-total">
          <Currency :amount="totalGlobal - totalAvailable - totalJoint" />
        </div>
      </div>
      <div class="accounts-row">
        <compte
          v-for="account in bloquedCompte"
          :key="'account-' + account.IDcompte"
          :account-informations="account"
          fa-icon="times-circle"
          compact-mode="true"
        />
      </div>
    </div>

    <!-- Total Global -->
    <div class="global-total">
      <div class="global-total-content">
        <span class="global-title">TOTAL GLOBAL</span>
        <div
          class="global-amount"
          :class="{ warning: warningTotal && totalGlobal < warningTotal }"
        >
          <Currency :amount="totalGlobal" />
        </div>
        <div
          v-if="warningTotal && totalGlobal < warningTotal"
          class="global-warning"
        >
          <span>Objectif annuel: <Currency :amount="totalGlobal - warningTotal" /></span>
        </div>
      </div>
    </div>

    <!-- Section Retraite -->
    <div
      v-if="retraiteCompte.length > 0"
      class="section-compact"
    >
      <div class="section-header">
        <span class="section-title">🏦 Retraite</span>
        <div class="section-total">
          <Currency :amount="totalRetraite" />
        </div>
      </div>
      <div class="accounts-row">
        <compte
          v-for="account in retraiteCompte"
          :key="'account-' + account.IDcompte"
          :account-informations="account"
          fa-icon="times-circle"
          compact-mode="true"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useStore } from 'vuex'
  import Compte from './Compte.vue'
  import Currency from '../Currency.vue'

  const store = useStore()

  const warningTotal = computed(() => store.state.user.warningTotal)
  const totalAvailable = computed(() => store.getters.totalAvailable)
  const totalGlobal = computed(() => store.getters.totalGlobal)
  const totalRetraite = computed(() => store.getters.totalRetraite)
  const totalJoint = computed(() => store.getters.totalJoint)
  const availableCompte = computed(() => store.getters.availableCompte)
  const bloquedCompte = computed(() => store.getters.bloquedCompte)
  const retraiteCompte = computed(() => store.getters.retraiteCompte)
  const porteFeuilleCompte = computed(() => store.getters.porteFeuilleCompte)
  const jointCompte = computed(() => store.getters.jointCompte)
</script>

<style scoped>
.compte-list-compact {
  padding: 12px;
  max-width: 100%;
}

.section-compact {
  margin-bottom: 16px;
  background: white;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
}

.section-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
}

.section-total {
  font-size: 1rem;
  font-weight: 700;
  color: #10b981;
}

.section-total.warning {
  color: #f59e0b;
}

.accounts-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-radius: 6px;
  border-top: 2px solid #cbd5e0;
}

.total-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.total-amount {
  font-size: 1.1rem;
  font-weight: 700;
  color: #10b981;
}

.total-amount.warning {
  color: #f59e0b;
}

.global-total {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border-radius: 12px;
  padding: 16px;
  color: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  margin-bottom: 16px;
}

.global-total-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.global-title {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 1px;
  opacity: 0.8;
  margin-bottom: 8px;
}

.global-amount {
  font-size: 1.8rem;
  font-weight: 800;
  color: #10b981;
}

.global-amount.warning {
  color: #f59e0b;
}

.global-warning {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 8px;
  font-size: 0.8rem;
  opacity: 0.9;
}

@media (max-width: 768px) {
  .compte-list-compact {
    padding: 8px;
  }

  .section-compact {
    padding: 8px;
    margin-bottom: 12px;
  }

  .global-total {
    padding: 12px;
  }

  .global-amount {
    font-size: 1.5rem;
  }
}
</style>
