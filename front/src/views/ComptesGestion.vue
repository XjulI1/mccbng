<template>
  <div class="comptes-gestion-view">
    <div class="page-header">
      <h1 class="page-title">
        Mes comptes
      </h1>
    </div>

    <div
      v-if="!accountList.length"
      class="empty-state"
    >
      Aucun compte pour l'instant.
    </div>

    <div
      v-else
      class="compte-list"
    >
      <button
        v-for="account in sortedAccountList"
        :key="'compte-' + account.IDcompte"
        type="button"
        class="compte-row"
        :class="{ 'is-hidden': !account.visible }"
        @click="goEdit(account.IDcompte)"
      >
        <div class="compte-row-main">
          <div class="compte-row-name">
            <span class="compte-row-bank">
              {{ account.banque?.NomBanque || '—' }}
            </span>
            <span class="compte-row-title">{{ account.NomCompte }}</span>
          </div>
          <div class="compte-row-flags">
            <span
              v-if="!account.visible"
              class="flag flag-hidden"
            >Masqué</span>
            <span
              v-if="account.bloque"
              class="flag"
            >🔒 Bloqué</span>
            <span
              v-if="account.joint"
              class="flag"
            >🤝 Joint</span>
            <span
              v-if="account.children"
              class="flag"
            >👶 Enfant</span>
            <span
              v-if="account.retraite"
              class="flag"
            >🏦 Retraite</span>
            <span
              v-if="account.porte_feuille"
              class="flag"
            >💰 Portefeuille</span>
          </div>
        </div>
        <div class="compte-row-meta">
          <div class="compte-row-last-op">
            <span class="meta-label">Dernière op.</span>
            <span class="meta-value">{{ formatLastOp(account.IDcompte) }}</span>
          </div>
          <font-awesome-icon
            icon="chevron-right"
            class="chevron"
          />
        </div>
      </button>
    </div>

    <router-view />
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useStore } from 'vuex'

  const store = useStore()
  const router = useRouter()

  const accountList = computed(() => store.state.compte.accountList || [])
  const managementInfo = computed(() => store.state.compte.managementInfo || [])

  const sortedAccountList = computed(() => {
    return [...accountList.value].sort((a, b) => {
      if (a.visible !== b.visible) return a.visible ? -1 : 1
      return (a.NomCompte || '').localeCompare(b.NomCompte || '')
    })
  })

  const formatLastOp = (IDcompte) => {
    const info = managementInfo.value.find((i) => i.IDcompte === IDcompte)
    if (!info?.lastOpDate) return 'Aucune'
    const d = new Date(info.lastOpDate)
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const goEdit = (IDcompte) => {
    router.push(`/editCompte/${IDcompte}`)
  }

  onMounted(() => {
    store.commit('setActiveAccount', { NomCompte: 'Mes comptes' })
    if (!accountList.value.length) {
      store.dispatch('fetchAccountList')
    }
    store.dispatch('fetchComptesManagementInfo')
  })
</script>

<style lang="scss" scoped>
.comptes-gestion-view {
  min-height: calc(100vh - #{$header-height-and-margin});
  padding: 0 16px calc(#{$navbar-height-and-margin} + 24px);
  max-width: 960px;
  margin: 0 auto;
}

.page-header {
  padding: 16px 4px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #2d3748);
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 40px 16px;
  color: var(--text-secondary, #a0aec0);
}

.compte-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.compte-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: var(--bg-card, #fff);
  border: var(--card-border, 1px solid rgba(0, 0, 0, 0.05));
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.05));
  cursor: pointer;
  font: inherit;
  color: inherit;
  text-align: left;
  width: 100%;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.compte-row:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.1));
}

.compte-row.is-hidden {
  opacity: 0.6;
}

.compte-row-main {
  flex: 1;
  min-width: 0;
}

.compte-row-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 6px;
}

.compte-row-bank {
  font-size: 0.75rem;
  color: var(--text-secondary, #a0aec0);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.compte-row-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #2d3748);
}

.compte-row-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.flag {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--bg-secondary, #edf2f7);
  color: var(--text-secondary, #4a5568);
  white-space: nowrap;
}

.flag-hidden {
  background: #fed7d7;
  color: #9b2c2c;
}

.compte-row-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.compte-row-last-op {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
  font-size: 0.75rem;
}

.meta-label {
  color: var(--text-secondary, #a0aec0);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.meta-value {
  font-weight: 600;
  color: var(--text-primary, #2d3748);
}

.chevron {
  color: var(--text-secondary, #cbd5e0);
}

@media (max-width: 480px) {
  .compte-row-last-op {
    font-size: 0.7rem;
  }
}
</style>
