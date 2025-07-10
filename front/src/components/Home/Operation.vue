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

.operation-checkbox {
  display: flex;
  align-items: center;
}

.operation-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid #d1d5db;
  cursor: pointer;
  transition: all 0.2s ease;
}

.operation-checkbox input[type="checkbox"]:checked {
  background-color: #3b82f6;
  border-color: #3b82f6;
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
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s ease;
}

.operation-name:hover {
  color: #3b82f6;
}

.operation-name.noCategory {
  color: #6b7280;
  font-style: italic;
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
  border-radius: 8px;
  background: #f3f4f6;
  text-decoration: none;
  font-size: 1rem;
  transition: all 0.2s ease;
  border: 1px solid #d1d5db;
}

.edit-btn:hover {
  background: #e5e7eb;
  transform: scale(1.05);
  border-color: #9ca3af;
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
