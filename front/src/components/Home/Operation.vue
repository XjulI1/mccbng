<template>
  <div class="operation-card">
    <div class="operation-row">
      <div class="operation-checkbox">
        <input
          :id="checkBoxIDValue"
          v-model="modelValue"
          type="checkbox"
          @change="updateCheckOp"
        >
      </div>
      <div class="operation-info">
        <label
          :for="checkBoxIDValue"
          :data-id="operation.IDop"
          class="operation-name"
          :class="css.category"
        >
          {{ operation.NomOp }}
        </label>
        <span class="operation-date">{{ dateOperation }}</span>
      </div>
      <div
        class="operation-amount"
        :class="css.montant"
      >
        <Currency :amount="operation.MontantOp" />
      </div>
      <div
        v-if="isSearchMode"
        class="operation-account"
      >
        <span class="account-badge">{{ accountName }}</span>
      </div>
      <div class="operation-actions">
        <router-link
          :to="'/editOperation/' + operation.IDop"
          class="edit-btn"
          title="Modifier l'opération"
        >
          ✏️
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useStore } from 'vuex'
  import Currency from '../Currency.vue'

  const props = defineProps({
    operation: {
      type: Object,
      default: () => {}
    }
  })

  const store = useStore()

  const checkBoxID = (operationID: any) => {
    return 'checkboxOperationID-' + operationID
  }

  const generateCssVariables = (operation: any) => {
    return {
      category: operation.IDcat === 0 ? 'noCategory' : '',
      montant: operation.MontantOp > 0 ? 'montantIn' : 'montantOut'
    }
  }

  const generateDateOperationVariables = (operation: any) => {
    return new Date(operation.DateOp).toLocaleDateString()
  }

  const dateOperation = ref(generateDateOperationVariables(props.operation))
  const css = ref(generateCssVariables(props.operation))
  const checkBoxIDValue = checkBoxID(props.operation.IDop)

  const modelValue = computed(() => {
    return props.operation.CheckOp
  })

  const isSearchMode = computed(() => store.state.operation.isSearchMode)

  const accountName = computed(() => {
    return (
      store.state.compte.accountList.find(
        (account) => account.IDcompte === props.operation.IDcompte
      )?.NomCompte || 'Compte inconnu'
    )
  })

  watch(
    () => props.operation,
    () => {
      dateOperation.value = generateDateOperationVariables(props.operation)
      css.value = generateCssVariables(props.operation)
    }
  )

  const updateCheckOp = () => {
    store.dispatch('updateOperation', {
      ...props.operation,
      CheckOp: !props.operation.CheckOp
    })
  }
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
}

.operation-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.operation-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.operation-checkbox {
  display: flex;
  align-items: center;
}

.operation-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-sm);
  border: 2px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.operation-checkbox input[type="checkbox"]:checked {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
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
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s ease;
}

.operation-name:hover {
  color: var(--color-primary);
}

.operation-name.noCategory {
  color: var(--text-muted);
  font-style: italic;
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

.operation-actions {
  display: flex;
  align-items: center;
}

.edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  text-decoration: none;
  font-size: 1rem;
  transition: all 0.2s ease;
  border: 1px solid var(--border-color);
}

.edit-btn:hover {
  background: var(--bg-muted);
  transform: scale(1.05);
  border-color: var(--text-muted);
}

.operation-account {
  display: flex;
  align-items: center;
}

.account-badge {
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-primary);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: 20px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  display: inline-block;
  font-size: 0.85rem;
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

@media (max-width: 768px) {
  .operation-row {
    gap: 12px;
  }

  .operation-amount {
    font-size: 1rem;
    min-width: auto;
    padding: 4px 8px;
  }

  .operation-name {
    font-size: 1rem;
  }

  .operation-date {
    font-size: 0.8rem;
  }
}
</style>
