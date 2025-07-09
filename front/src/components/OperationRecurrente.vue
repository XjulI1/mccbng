<template>
  <div class="operation-card">
    <div class="operation-row">
      <div class="operation-info">
        <span class="operation-name">{{ operation.NomOpRecu }}</span>
        <span class="operation-date">{{ dateOperation }}</span>
      </div>
      <div
        class="operation-amount"
        :class="css.montant"
      >
        <Currency :amount="operation.MontantOpRecu" />
      </div>
      <div
        v-if="showAccount"
        class="operation-account"
      >
        <span class="account-badge">{{ accountName }}</span>
      </div>
      <div
        v-if="showCategory"
        class="operation-category"
      >
        <span class="category-badge">{{ categoryName }}</span>
      </div>
      <div class="operation-controls">
        <button
          class="control-btn"
          :class="{ active: showAccount }"
          title="Afficher/masquer le compte"
          @click="toggleAccount"
        >
          💳
        </button>
        <button
          class="control-btn"
          :class="{ active: showCategory }"
          title="Afficher/masquer la catégorie"
          @click="toggleCategory"
        >
          🏷️
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useStore } from 'vuex'
  import Currency from './Currency.vue'

  const props = defineProps({
    operation: {
      type: Object,
      default: () => {}
    }
  })

  const store = useStore()

  // État pour afficher/masquer les colonnes
  const showAccount = ref(false)
  const showCategory = ref(false)

  // Fonctions pour basculer l'affichage
  const toggleAccount = () => {
    showAccount.value = !showAccount.value
  }

  const toggleCategory = () => {
    showCategory.value = !showCategory.value
  }

  const dateOperation = computed(() => {
    return new Date(props.operation.DernierDateOpRecu).toLocaleDateString()
  })

  const css = computed(() => ({
    montant: props.operation.MontantOpRecu > 0 ? 'montantIn' : 'montantOut'
  }))

  const accountName = computed(() => {
    return (
      store.state.compte.accountList.find(
        (account) => account.IDcompte === props.operation.IDcompte
      )?.NomCompte || 'Unknown Account'
    )
  })
  const categoryName = computed(() => {
    return (
      store.state.category.list.find(
        (category) => category.IDcat === props.operation.IDcat
      )?.Nom || 'Unknown Category'
    )
  })
</script>

<style scoped>
.operation-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  color: #374151;
  transition: all 0.3s ease;
}

.operation-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.operation-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.operation-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.operation-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
}

.operation-date {
  font-size: 0.85rem;
  color: #6b7280;
  font-weight: 400;
}

.operation-amount {
  font-size: 1.2rem;
  font-weight: 700;
  text-align: right;
  padding: 6px 12px;
  border-radius: 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  min-width: 100px;
  max-width: fit-content;
  max-height: fit-content;
}

.operation-account {
  min-width: 120px;
  text-align: right;
}

.operation-category {
  min-width: 120px;
}

.montantIn {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
  border-color: rgba(74, 222, 128, 0.3);
}

.montantOut {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
  border-color: rgba(248, 113, 113, 0.3);
}

.account-badge {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  display: inline-block;
  max-width: fit-content;
  font-size: 0.9rem;
}

.category-badge {
  background: rgba(168, 85, 247, 0.1);
  color: #a855f7;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(168, 85, 247, 0.2);
  display: inline-block;
  max-width: fit-content;
  font-size: 0.9rem;
}

.operation-controls {
  display: flex;
  gap: 4px;
  align-items: center;
}

.control-btn {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  opacity: 0.7;
}

.control-btn:hover {
  background: #e5e7eb;
  transform: scale(1.05);
}

.control-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  opacity: 1;
}

.control-btn.active:hover {
  background: #2563eb;
}

@media (max-width: 768px) {
  .operation-row {
    align-items: center;
    gap: 12px;
  }

  .operation-amount {
    text-align: left;
    min-width: auto;
    max-width: fit-content;
    max-height: fit-content;
  }

  .operation-account,
  .operation-category {
    min-width: auto;
  }
}
</style>
