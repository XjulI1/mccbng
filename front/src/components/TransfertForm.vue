<template>
  <div
    class="transfert-form"
    @keypress.enter="updateOperation"
  >
    <div class="form-card">
      <h2 class="form-title">
        Nouveau {{ route.name }}
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
          placeholder="Entrez le titre du transfert"
        >
      </div>

      <div class="form-row">
        <div class="form-group">
          <label
            for="operation-montant"
            class="form-label"
          >Montant</label>
          <input
            id="operation-montant"
            v-model="operation.MontantOp"
            type="number"
            class="form-input"
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
        <label class="form-label">Transfert</label>
        <div class="transfer-group">
          <div class="transfer-select">
            <label class="transfer-label">Compte débiteur</label>
            <select
              v-model="operation.IDcompteDebit"
              class="form-select"
            >
              <option
                value=""
                disabled
              >
                Sélectionnez un compte
              </option>
              <option
                v-for="account in accountsDebit"
                :key="'account-debit-' + account.IDcompte"
                :value="account.IDcompte"
              >
                {{ account.NomCompte }}
              </option>
            </select>
          </div>

          <div class="transfer-arrow">
            <svg
              class="arrow-icon"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 5L16 12L9 19"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>

          <div class="transfer-select">
            <label class="transfer-label">Compte créditeur</label>
            <select
              v-model="operation.IDcompteCredit"
              class="form-select"
            >
              <option
                value=""
                disabled
              >
                Sélectionnez un compte
              </option>
              <option
                v-for="account in accountsCredit"
                :key="'account-credit-' + account.IDcompte"
                :value="account.IDcompte"
              >
                {{ account.NomCompte }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button
          type="button"
          class="btn btn-primary"
          @click="updateOperation"
        >
          <span class="btn-icon">✓</span>
          Valider
        </button>

        <button
          v-if="invertButton"
          type="button"
          class="btn btn-warning"
          @click="invertTransfert"
        >
          <span class="btn-icon">⇄</span>
          {{ invertButton }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import { useRoute, useRouter } from 'vue-router'

  const cash = computed(() => {
    return String(route.name).includes('Retrait')
  })

  const store = useStore()
  const route = useRoute()
  const router = useRouter()

  const operation = ref({
    NomOp: route.name,
    MontantOp: 0,
    DateOp: '',
    IDcompteDebit: undefined,
    IDcompteCredit: undefined,
    IDcat: cash.value ? 21 : 25
  })

  const activeAccountID = computed(
    () => store.state.compte.activeAccount.IDcompte
  )
  const visibleAccounts = computed(() => store.getters.visibleAccounts)
  const porteFeuilleCompte = computed(() => store.getters.porteFeuilleCompte)
  const getAccount = computed(() => store.getters.getAccount)

  const accountsDebit = computed(() => {
    return visibleAccounts.value.filter((account) => {
      const IDcompte = parseFloat(account.IDcompte)
      if (
        IDcompte !== parseFloat(operation.value.IDcompteCredit || '0') &&
        IDcompte !== parseFloat(porteFeuilleCompte.value[0].IDcompte)
      ) {
        return account
      }
      return undefined
    })
  })

  const accountsCredit = computed(() => {
    if (cash.value) {
      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      operation.value.IDcompteCredit = porteFeuilleCompte.value[0].IDcompte
      return porteFeuilleCompte.value
    }

    return visibleAccounts.value.filter((account) => {
      const IDcompte = parseFloat(account.IDcompte)

      if (
        parseFloat(account.IDcompte) !==
        parseFloat(operation.value.IDcompteDebit || '0') &&
        IDcompte !== parseFloat(porteFeuilleCompte.value[0].IDcompte)
      ) {
        return account
      }
      return undefined
    })
  })

  const invertButton = computed(() => {
    switch (route.name) {
    case 'Retrait':
      return 'Virement'
    case 'Virement':
      return 'Retrait'
    default:
      return undefined
    }
  })

  watch(activeAccountID, (value) => {
    operation.value.IDcompteDebit = value
  })

  watch(
    () => cash.value,
    (value) => {
      operation.value.IDcat = value ? 21 : 25
    }
  )

  watch(
    () => route.name,
    (value) => {
      operation.value.NomOp = value
    }
  )

  const blurMontantOp = (event) => {
    operation.value.MontantOp = parseFloat(event.target.value)
  }

  const updateOperation = () => {
    const NomOp =
      String(operation.value.NomOp) +
      ' (' +
      getAccount.value(operation.value.IDcompteDebit).NomCompte +
      ' -> ' +
      getAccount.value(operation.value.IDcompteCredit).NomCompte +
      ')'
    store.dispatch('createTransfert', {
      ...operation.value,
      NomOp,
      DateOp: new Date(operation.value.DateOp)
    })

    resetOperationAttribut()
  }

  const invertTransfert = () => {
    switch (route.name) {
    case 'Retrait':
      return router.push('/transfert')
    case 'Virement':
      return router.push('/retrait')
    default:
      return undefined
    }
  }

  const resetOperationAttribut = () => {
    operation.value.MontantOp = 0
    operation.value.IDcompteCredit = undefined
  }

  // Lifecycle hooks
  onMounted(() => {
    const nameInput = document.querySelector(
      '#operation-name'
    ) as HTMLInputElement
    if (nameInput) {
      nameInput.focus()
    }
    operation.value.IDcompteDebit = activeAccountID.value
  })

  // Equivalent to created
  operation.value.DateOp = new Date().toISOString().split('T')[0]
</script>

<style scoped>
.transfert-form {
  max-width: 600px;
  margin: -1rem;
  padding: var(--spacing-lg);
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

.transfer-label {
  display: block;
  font-weight: var(--font-weight-medium);
  color: var(--text-muted);
  margin-bottom: var(--spacing-sm);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
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

.transfer-group {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--spacing-lg);
  align-items: center;
  background: var(--bg-secondary);
  padding: var(--spacing-xl);
  border-radius: var(--radius-lg);
  border: 2px solid var(--border-color);
}

.transfer-select {
  display: flex;
  flex-direction: column;
}

.transfer-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm);
  margin-top: var(--spacing-xl);
}

.arrow-icon {
  width: 24px;
  height: 24px;
  color: var(--color-primary);
  background: var(--bg-card);
  padding: var(--spacing-sm);
  border-radius: 50%;
  box-shadow: var(--shadow-sm);
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

.btn-secondary {
  background: var(--neutral-gradient);
  color: white;
}

.btn-secondary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-btn);
}

.btn-warning {
  background: var(--warning-gradient);
  color: white;
}

.btn-warning:hover {
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

  .transfer-group {
    grid-template-columns: 1fr;
    gap: 0;
    text-align: center;
  }

  .transfer-arrow {
    margin-top: var(--spacing-sm);
    transform: rotate(90deg);
  }
}
</style>
