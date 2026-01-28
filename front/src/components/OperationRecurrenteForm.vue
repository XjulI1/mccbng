<template>
  <div
    v-if="operationRecurrente"
    class="operation-form"
    @keypress.enter="updateOperationRecurrente"
  >
    <div class="form-card">
      <h2 class="form-title">
        {{
          operationRecurrente.IDopRecu
            ? "Modifier l'opération récurrente"
            : "Nouvelle opération récurrente"
        }}
      </h2>

      <div class="form-group">
        <label
          for="operation-name"
          class="form-label"
        >Titre</label>
        <input
          id="operation-name"
          v-model="operationRecurrente.NomOpRecu"
          type="text"
          class="form-input"
          placeholder="Entrez le titre de l'opération récurrente"
        >
      </div>

      <div class="form-group">
        <label
          for="operation-amount"
          class="form-label"
        >Montant</label>
        <input
          id="operation-amount"
          v-model="operationRecurrente.MontantOpRecu"
          type="number"
          class="form-input"
          :class="montantClass()"
          placeholder="0.00"
          step="0.01"
          @blur="blurMontantOp"
        >
      </div>

      <div class="form-row">
        <div class="form-group">
          <label
            for="operation-frequency"
            class="form-label"
          >Fréquence</label>
          <select
            id="operation-frequency"
            v-model="operationRecurrente.Frequence"
            class="form-select"
          >
            <option value="3">
              Mensuelle
            </option>
            <option value="7">
              Annuelle
            </option>
          </select>
        </div>

        <div
          v-if="isYearly"
          class="form-group"
        >
          <label
            for="operation-month"
            class="form-label"
          >Mois</label>
          <select
            id="operation-month"
            v-model="operationRecurrente.MoisOpRecu"
            class="form-select"
          >
            <option value="0">
              Janvier
            </option>
            <option value="1">
              Février
            </option>
            <option value="2">
              Mars
            </option>
            <option value="3">
              Avril
            </option>
            <option value="4">
              Mai
            </option>
            <option value="5">
              Juin
            </option>
            <option value="6">
              Juillet
            </option>
            <option value="7">
              Août
            </option>
            <option value="8">
              Septembre
            </option>
            <option value="9">
              Octobre
            </option>
            <option value="10">
              Novembre
            </option>
            <option value="11">
              Décembre
            </option>
          </select>
        </div>

        <div class="form-group">
          <label
            for="operation-day-num"
            class="form-label"
          >Jour du mois</label>
          <input
            id="operation-day-num"
            v-model="operationRecurrente.JourNumOpRecu"
            type="number"
            class="form-input"
            placeholder="Jour (1-31)"
            min="1"
            max="31"
          >
        </div>
      </div>

      <div class="form-group">
        <label
          for="operation-account"
          class="form-label"
        >Compte</label>
        <select
          id="operation-account"
          v-model="operationRecurrente.IDcompte"
          class="form-select"
        >
          <option
            value=""
            disabled
          >
            Sélectionnez un compte
          </option>
          <option
            v-for="account in accountList"
            :key="'account-' + account.IDcompte"
            :value="account.IDcompte"
          >
            {{ account.NomCompte }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label
          for="operation-category"
          class="form-label"
        >Catégorie</label>
        <select
          id="operation-category"
          v-model="operationRecurrente.IDcat"
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
          @click="updateOperationRecurrente"
        >
          <span class="btn-icon">✓</span>
          {{ operationRecurrente.IDopRecu ? "Modifier" : "Créer" }}
        </button>

        <button
          v-if="operationRecurrente.IDopRecu"
          type="button"
          class="btn btn-danger"
          @click="deleteOperationRecurrente"
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

  const operationRecurrenteID = ref(route.params.id)

  const montantOpIsPositive = ref(false)
  const operationRecurrente = ref({
    IDopRecu: undefined,
    NomOpRecu: '',
    MontantOpRecu: 0,
    JourOpRecu: 1,
    JourNumOpRecu: 1,
    MoisOpRecu: 1,
    Frequence: 3,
    DernierDateOpRecu: new Date(),
    IDcompte: undefined,
    IDcat: 0
  })

  const accountList = computed(() =>
    store.state.compte.accountList.filter((account) => account.visible)
  )
  const categoryList = computed(() => store.state.category.list)
  const activeAccountID = computed(
    () => store.state.compte.activeAccount.IDcompte
  )
  const isYearly = computed(() => operationRecurrente.value.Frequence === 7)

  watch(activeAccountID, (value) => {
    if (!operationRecurrente.value.IDopRecu) {
      operationRecurrente.value.IDcompte = value
    }
  })

  const blurMontantOp = (event) => {
    operationRecurrente.value.MontantOpRecu = parseFloat(event.target.value)

    if (
      operationRecurrente.value.MontantOpRecu > 0 &&
      !montantOpIsPositive.value
    ) {
      operationRecurrente.value.MontantOpRecu *= -1
    }
  }

  const montantClass = () => {
    return montantOpIsPositive.value ? 'montant-positif' : 'montant-negatif'
  }

  const montantIsPositive = () => {
    montantOpIsPositive.value = true
    operationRecurrente.value.MontantOpRecu = Math.abs(
      operationRecurrente.value.MontantOpRecu
    )
  }

  const montantIsNegative = () => {
    montantOpIsPositive.value = false
    operationRecurrente.value.MontantOpRecu *= -1
  }

  const updateOperationRecurrente = () => {
    store.dispatch('updateRecurringOperation', operationRecurrente.value)

    if (operationRecurrente.value.IDopRecu === undefined) {
      resetOperationAttribut()
    } else {
      router.push('/recurrOperation')
    }
  }

  const deleteOperationRecurrente = () => {
    store.dispatch('deleteRecurringOperation', operationRecurrente.value)
    router.push('/recurrOperation')
  }

  const resetOperationAttribut = () => {
    operationRecurrente.value.NomOpRecu = ''
    operationRecurrente.value.MontantOpRecu = 0
    operationRecurrente.value.JourOpRecu = 1
    operationRecurrente.value.Frequence = 3
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
    if (!operationRecurrente.value.IDopRecu) {
      operationRecurrente.value.IDcompte = activeAccountID.value
    }
  })

  // Equivalent to created
  if (operationRecurrenteID.value) {
    const existingOperation = store.state.operation.recurringOperations?.find(
      (op) => op.IDopRecu === parseInt(operationRecurrenteID.value as string)
    )
    if (existingOperation) {
      operationRecurrente.value = { ...existingOperation }
      montantOpIsPositive.value = operationRecurrente.value.MontantOpRecu > 0
    }
  } else {
    operationRecurrente.value.DernierDateOpRecu = new Date()
    operationRecurrente.value.IDcompte = activeAccountID.value
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
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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
}
</style>
