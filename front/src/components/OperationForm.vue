<template>
  <div
    v-if="operation"
    class="operation-form"
    @keypress.enter="updateOperation"
  >
    <div class="form-card">
      <h2 class="form-title">
        {{ operation.IDop ? "Modifier l'opération" : "Nouvelle opération" }}
      </h2>

      <div class="form-group">
        <label
          for="operation-name"
          class="form-label"
        >Titre</label>
        <input
          id="operation-name"
          v-model="operation.NomOp"
          type="text"
          class="form-input"
          placeholder="Entrez le titre de l'opération"
        >
      </div>

      <div class="form-row">
        <div class="form-group">
          <label
            for="operation-amount"
            class="form-label"
          >Montant</label>
          <input
            id="operation-amount"
            v-model="operation.MontantOp"
            type="number"
            class="form-input"
            :class="montantClass()"
            placeholder="0.00"
            step="0.01"
            @blur="blurMontantOp"
          >
        </div>

        <div class="form-group">
          <label
            for="operation-date"
            class="form-label"
          >Date</label>
          <input
            id="operation-date"
            v-model="operation.DateOp"
            type="date"
            class="form-input"
          >
        </div>
      </div>

      <div class="form-group">
        <label
          for="operation-category"
          class="form-label"
        >Catégorie</label>
        <select
          id="operation-category"
          v-model="operation.IDcat"
          class="form-select"
        >
          <option
            value=""
            disabled
          >
            Sélectionnez une catégorie
          </option>
          <option
            v-for="category in categoryList"
            :key="'category-' + category.IDcat"
            :value="category.IDcat"
          >
            {{ category.Nom }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <div class="checkbox-group">
          <div class="checkbox-item">
            <input
              id="OpCheck"
              v-model="operation.CheckOp"
              type="checkbox"
              class="checkbox-input"
            >
            <label
              class="checkbox-label"
              for="OpCheck"
            >
              <span class="checkbox-custom" />
              Vérifié
            </label>
          </div>

          <div class="checkbox-item">
            <input
              id="Amortissement"
              v-model="operation.amortissement"
              type="checkbox"
              class="checkbox-input"
            >
            <label
              class="checkbox-label"
              for="Amortissement"
            >
              <span class="checkbox-custom" />
              Amortissement
            </label>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Type d'opération</label>
        <div class="toggle-group">
          <button
            type="button"
            :class="[
              'toggle-btn',
              'toggle-btn-credit',
              { active: montantOpIsPositive },
            ]"
            @click="montantIsPositive"
          >
            <span class="toggle-icon">+</span>
            Crédit
          </button>
          <button
            type="button"
            :class="[
              'toggle-btn',
              'toggle-btn-debit',
              { active: !montantOpIsPositive },
            ]"
            @click="montantIsNegative"
          >
            <span class="toggle-icon">-</span>
            Débit
          </button>
        </div>
      </div>

      <div class="form-actions">
        <button
          type="button"
          class="btn btn-primary"
          @click="updateOperation"
        >
          <span class="btn-icon">✓</span>
          {{ operation.IDop ? "Modifier" : "Créer" }}
        </button>

        <button
          v-if="operation.IDop"
          type="button"
          class="btn btn-danger"
          @click="deleteOperation"
        >
          <span class="btn-icon">🗑</span>
          Supprimer
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import { useRoute, useRouter } from 'vue-router'

  const store = useStore()
  const route = useRoute()
  const router = useRouter()

  const operationID = ref(route.params.id)

  const montantOpIsPositive = ref(false)
  const operation = ref({
    IDop: undefined,
    NomOp: '',
    MontantOp: 0,
    DateOp: '',
    CheckOp: false,
    IDcompte: undefined,
    IDcat: 0,
    amortissement: false
  })

  const activeAccountID = computed(
    () => store.state.compte.activeAccount.IDcompte
  )
  const categoryList = computed(() => store.state.category.list)

  watch(activeAccountID, (value) => {
    operation.value.IDcompte = value
  })

  const blurMontantOp = (event) => {
    operation.value.MontantOp = parseFloat(event.target.value)

    if (operation.value.MontantOp > 0 && !montantOpIsPositive.value) {
      operation.value.MontantOp *= -1
    }
  }

  const montantClass = () => {
    return montantOpIsPositive.value ? 'montant-positif' : 'montant-negatif'
  }

  const montantIsPositive = () => {
    montantOpIsPositive.value = true
    operation.value.MontantOp = Math.abs(operation.value.MontantOp)
  }

  const montantIsNegative = () => {
    montantOpIsPositive.value = false
    operation.value.MontantOp *= -1
  }

  const updateOperation = () => {
    store.dispatch('updateOperation', {
      ...operation.value,
      DateOp: new Date(operation.value.DateOp)
    })

    if (operation.value.IDop === undefined) {
      resetOperationAttribut()
    } else {
      router.push('/')
    }
  }

  const deleteOperation = () => {
    store.dispatch('deleteOperation', operation.value)
    router.push('/')
  }

  const resetOperationAttribut = () => {
    operation.value.NomOp = ''
    operation.value.MontantOp = 0
    operation.value.CheckOp = false
    operation.value.amortissement = false
    montantOpIsPositive.value = false
  }

  // Lifecycle hooks
  onMounted(() => {
    const nameInput = document.querySelector(
      '#operation-name'
    ) as HTMLInputElement
    if (nameInput) {
      nameInput.focus()
    }
    operation.value.IDcompte = activeAccountID.value
  })

  // Equivalent to created
  if (operationID.value) {
    const existingOperation = store.getters.operationFromCurrentList(
      operationID.value
    )
    if (existingOperation) {
      operation.value = { ...existingOperation }
      operation.value.DateOp = new Date(existingOperation.DateOp)
        .toISOString()
        .split('T')[0]
      montantOpIsPositive.value = operation.value.MontantOp > 0
    }
  } else {
    operation.value.DateOp = new Date().toISOString().split('T')[0]
  }
</script>

<style scoped>
.operation-form {
  max-width: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  width: 100%;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.form-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 1rem;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-label {
  display: block;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: #f8fafc;
  color: #2d3748;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  transform: translateY(-1px);
}

.form-input::placeholder {
  color: #a0aec0;
}

.montant-positif {
  border-color: #48bb78 !important;
  color: #38a169;
  background: #f0fff4;
}

.montant-negatif {
  border-color: #f56565 !important;
  color: #e53e3e;
  background: #fff5f5;
}

.checkbox-group {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.checkbox-item {
  display: flex;
  align-items: center;
}

.checkbox-input {
  display: none;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  font-weight: 500;
  color: #4a5568;
  transition: color 0.3s ease;
}

.checkbox-custom {
  width: 20px;
  height: 20px;
  border: 2px solid #cbd5e0;
  border-radius: 6px;
  margin-right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.checkbox-input:checked + .checkbox-label .checkbox-custom {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
}

.checkbox-input:checked + .checkbox-label .checkbox-custom::after {
  content: "✓";
  color: white;
  font-weight: bold;
  font-size: 12px;
}

.checkbox-input:checked + .checkbox-label {
  color: #667eea;
}

.toggle-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  max-width: 300px;
  margin: auto;
  gap: 1rem;
  background: #f7fafc;
  padding: 0.5rem;
  border-radius: 12px;
  border: 2px solid #e2e8f0;
}

.toggle-btn {
  padding: 0.5rem 0.8rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: transparent;
  color: #718096;
}

.toggle-btn-credit {
  background: rgba(72, 187, 120, 0.1);
  color: #38a169;
  border: 2px solid rgba(72, 187, 120, 0.3);
}

.toggle-btn-credit:hover {
  background: rgba(72, 187, 120, 0.2);
  transform: translateY(-1px);
  border-color: #48bb78;
}

.toggle-btn-credit.active {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
  border-color: #48bb78;
}

.toggle-btn-debit {
  background: rgba(245, 101, 101, 0.1);
  color: #e53e3e;
  border: 2px solid rgba(245, 101, 101, 0.3);
}

.toggle-btn-debit:hover {
  background: rgba(245, 101, 101, 0.2);
  transform: translateY(-1px);
  border-color: #f56565;
}

.toggle-btn-debit.active {
  background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(245, 101, 101, 0.4);
  border-color: #f56565;
}

.toggle-icon {
  font-weight: bold;
  font-size: 1.1rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 1rem;
  min-width: 120px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  flex: 1;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.btn-danger {
  background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
  color: white;
}

.btn-danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(245, 101, 101, 0.4);
}

.btn-icon {
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .form-card {
    padding: 1.5rem;
  }

  .checkbox-group {
    gap: 1rem;
  }
}
</style>
