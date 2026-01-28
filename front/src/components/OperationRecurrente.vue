<template>
  <div
    class="operation-card"
    @click="editOperation"
  >
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
          @click.stop="toggleAccount"
        >
          💳
        </button>
        <button
          class="control-btn"
          :class="{ active: showCategory }"
          title="Afficher/masquer la catégorie"
          @click.stop="toggleCategory"
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
  import { useRouter } from 'vue-router'
  import Currency from './Currency.vue'

  const props = defineProps({
    operation: {
      type: Object,
      default: () => {}
    }
  })

  const store = useStore()
  const router = useRouter()

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

  const editOperation = () => {
    router.push(`/editRecurrOperation/${props.operation.IDopRecu}`)
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
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-sm);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  transition: all var(--transition-normal);
  cursor: pointer;
}

.operation-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary);
}

.operation-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.operation-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.operation-name {
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.operation-date {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: var(--font-weight-normal);
}

.operation-amount {
  font-size: 1.2rem;
  font-weight: var(--font-weight-bold);
  text-align: right;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
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
  color: var(--color-primary);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: 20px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  display: inline-block;
  max-width: fit-content;
  font-size: 0.9rem;
}

.category-badge {
  background: rgba(168, 85, 247, 0.1);
  color: #a855f7;
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: 20px;
  border: 1px solid rgba(168, 85, 247, 0.2);
  display: inline-block;
  max-width: fit-content;
  font-size: 0.9rem;
}

.operation-controls {
  display: flex;
  gap: var(--spacing-xs);
  align-items: center;
}

.control-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  opacity: 0.7;
}

.control-btn:hover {
  background: var(--bg-muted);
  transform: scale(1.05);
}

.control-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  opacity: 1;
}

.control-btn.active:hover {
  background: var(--color-primary-dark);
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
