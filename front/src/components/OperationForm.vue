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
          <optgroup
            v-if="suggestedCategories.length > 0"
            label="📌 Suggestions"
          >
            <option
              v-for="suggestion in suggestedCategories"
              :key="'suggested-' + suggestion.category.IDcat"
              :value="suggestion.category.IDcat"
            >
              {{ suggestion.category.Nom }} ({{ Math.round(suggestion.weight) }}%)
            </option>
          </optgroup>
          <optgroup
            v-if="suggestedCategories.length > 0"
            label="Toutes les catégories"
          >
            <option
              v-for="category in otherCategories"
              :key="'category-' + category.IDcat"
              :value="category.IDcat"
            >
              {{ category.Nom }}
            </option>
          </optgroup>
          <option
            v-for="category in categoryList"
            v-if="suggestedCategories.length === 0"
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
  import { suggestCategories } from '@/services/operation'

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

  const suggestedCategoriesData = ref([])

  const activeAccountID = computed(
    () => store.state.compte.activeAccount.IDcompte
  )
  const categoryList = computed(() => store.state.category.list)

  const suggestedCategories = computed(() => {
    if (suggestedCategoriesData.value.length === 0) return []

    return suggestedCategoriesData.value.map((suggestion: any) => {
      const category = categoryList.value.find(
        (cat: any) => cat.IDcat === suggestion.IDcat
      )
      return {
        ...suggestion,
        category
      }
    }).filter((item: any) => item.category)
  })

  const otherCategories = computed(() => {
    if (suggestedCategories.value.length === 0) return categoryList.value

    const suggestedIds = suggestedCategories.value.map((s: any) => s.category.IDcat)
    return categoryList.value.filter((cat: any) => !suggestedIds.includes(cat.IDcat))
  })

  watch(activeAccountID, (value) => {
    if (!operation.value.IDop) {
      operation.value.IDcompte = value
    }
  })

  // Debounce timer pour les suggestions
  let suggestTimeout: ReturnType<typeof setTimeout> | null = null

  watch(() => operation.value.NomOp, (newName) => {
    // Réinitialiser les suggestions si le champ est vide
    if (!newName || newName.trim().length < 2) {
      suggestedCategoriesData.value = []
      return
    }

    // Debounce pour éviter trop de requêtes
    if (suggestTimeout) {
      clearTimeout(suggestTimeout)
    }

    suggestTimeout = setTimeout(async () => {
      try {
        const suggestions = await suggestCategories(
          newName,
          store.state.user.token,
          import.meta.env.VITE_API_URL
        )
        suggestedCategoriesData.value = suggestions

        // Auto-sélectionner la première suggestion si elle a un poids élevé (>70%)
        if (suggestions.length > 0 && suggestions[0].weight > 70) {
          operation.value.IDcat = suggestions[0].IDcat
        }
      } catch (error) {
        console.error('Erreur lors de la suggestion de catégories:', error)
        suggestedCategoriesData.value = []
      }
    }, 500)
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
    if (!operation.value.IDop) {
      operation.value.IDcompte = activeAccountID.value
    }
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
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-2xl);
  box-shadow: var(--shadow-xl);
  width: 100%;
  backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
}

.form-title {
  font-size: 1.8rem;
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-lg);
  text-align: center;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.form-group {
  margin-bottom: var(--spacing-xl);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
}

.form-label {
  display: block;
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.875rem var(--spacing-lg);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
  transition: all var(--transition-normal);
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--border-color-focus);
  background: var(--bg-input);
  box-shadow: var(--input-focus-shadow);
  transform: translateY(-1px);
}

.form-input::placeholder {
  color: var(--text-light);
}

.montant-positif {
  border-color: var(--color-success) !important;
  color: var(--color-success-dark);
  background: var(--bg-success-light);
}

.montant-negatif {
  border-color: var(--color-danger) !important;
  color: var(--color-danger-dark);
  background: var(--bg-danger-light);
}

.checkbox-group {
  display: flex;
  gap: var(--spacing-2xl);
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
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  transition: color var(--transition-normal);
}

.checkbox-custom {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-sm);
  margin-right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-normal);
}

.checkbox-input:checked + .checkbox-label .checkbox-custom {
  background: var(--primary-gradient);
  border-color: var(--color-primary);
}

.checkbox-input:checked + .checkbox-label .checkbox-custom::after {
  content: "✓";
  color: white;
  font-weight: bold;
  font-size: 12px;
}

.checkbox-input:checked + .checkbox-label {
  color: var(--color-primary);
}

.toggle-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  max-width: 300px;
  margin: auto;
  gap: var(--spacing-lg);
  background: var(--bg-secondary);
  padding: var(--spacing-sm);
  border-radius: var(--radius-lg);
  border: 2px solid var(--border-color);
}

.toggle-btn {
  padding: var(--spacing-sm) 0.8rem;
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-normal);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  background: transparent;
  color: var(--text-muted);
}

.toggle-btn-credit {
  background: rgba(72, 187, 120, 0.1);
  color: var(--color-success-dark);
  border: 2px solid rgba(72, 187, 120, 0.3);
}

.toggle-btn-credit:hover {
  background: rgba(72, 187, 120, 0.2);
  transform: translateY(-1px);
  border-color: var(--color-success);
}

.toggle-btn-credit.active {
  background: var(--success-gradient);
  color: white;
  box-shadow: var(--shadow-btn);
  border-color: var(--color-success);
}

.toggle-btn-debit {
  background: rgba(245, 101, 101, 0.1);
  color: var(--color-danger-dark);
  border: 2px solid rgba(245, 101, 101, 0.3);
}

.toggle-btn-debit:hover {
  background: rgba(245, 101, 101, 0.2);
  transform: translateY(-1px);
  border-color: var(--color-danger);
}

.toggle-btn-debit.active {
  background: var(--danger-gradient);
  color: white;
  box-shadow: var(--shadow-btn);
  border-color: var(--color-danger);
}

.toggle-icon {
  font-weight: bold;
  font-size: 1.1rem;
}

.form-actions {
  display: flex;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-2xl);
  flex-wrap: wrap;
}

.btn {
  padding: 0.875rem var(--spacing-xl);
  border: none;
  border-radius: var(--radius-lg);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-normal);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-base);
  min-width: 120px;
}

.btn-primary {
  background: var(--primary-gradient);
  color: white;
  flex: 1;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-btn);
}

.btn-danger {
  background: var(--danger-gradient);
  color: white;
}

.btn-danger:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-btn);
}

.btn-icon {
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .form-card {
    padding: var(--spacing-xl);
  }

  .checkbox-group {
    gap: var(--spacing-lg);
  }
}
</style>
