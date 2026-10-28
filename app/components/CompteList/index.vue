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
        <span class="section-title">🤝 Joints</span>
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

    <!-- Section Comptes Children -->
    <div
      v-if="childrenCompte.length > 0"
      class="section-compact"
    >
      <div class="section-header">
        <span class="section-title">👶 Enfants</span>
        <div class="section-total">
          <Currency :amount="totalChildren" />
        </div>
      </div>
      <div class="accounts-row">
        <compte
          v-for="account in childrenCompte"
          :key="'account-' + account.IDcompte"
          :account-informations="account"
          fa-icon="child"
          compact-mode="true"
        />
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
  import { useCompteStore } from '@/stores/compte'
  import Compte from './Compte.vue'
  import Currency from '../Currency.vue'

  const compteStore = useCompteStore()

  const totalAvailable = computed(() => compteStore.totalAvailable)
  const totalGlobal = computed(() => compteStore.totalGlobal)
  const totalRetraite = computed(() => compteStore.totalRetraite)
  const totalJoint = computed(() => compteStore.totalJoint)
  const totalChildren = computed(() => compteStore.totalChildren)
  const availableCompte = computed(() => compteStore.availableCompte)
  const bloquedCompte = computed(() => compteStore.bloquedCompte)
  const retraiteCompte = computed(() => compteStore.retraiteCompte)
  const porteFeuilleCompte = computed(() => compteStore.porteFeuilleCompte)
  const jointCompte = computed(() => compteStore.jointCompte)
  const childrenCompte = computed(() => compteStore.childrenCompte)
</script>

<style scoped>
.compte-list-compact {
  padding: 12px;
  max-width: 100%;
}

.section-compact {
  margin-bottom: 16px;
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 12px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color-light);
}

.section-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.section-total {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-success);
}

.section-total.warning {
  color: var(--color-warning-dark);
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
  background: var(--bg-muted);
  border-radius: 6px;
  border-top: 2px solid var(--border-color);
}

.total-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.total-amount {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-success);
}

.total-amount.warning {
  color: var(--color-warning-dark);
}

@media (max-width: 768px) {
  .compte-list-compact {
    padding: 8px;
  }

  .section-compact {
    padding: 8px;
    margin-bottom: 12px;
  }

}
</style>
