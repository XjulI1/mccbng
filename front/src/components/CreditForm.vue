<template>
  <div
    v-if="credit"
    class="credit-form"
    @click="handleBackdropClick"
    @keypress.enter="updateCredit"
  >
    <div
      class="form-card"
      @click.stop
    >
      <h2 class="form-title">
        {{ credit.IDcredit ? "Modifier le crédit" : "Nouveau crédit" }}
      </h2>

      <div class="form-group">
        <label
          for="credit-name"
          class="form-label"
        >Nom du crédit</label>
        <input
          id="credit-name"
          v-model="credit.NomCredit"
          type="text"
          class="form-input"
          placeholder="Ex: Crédit immobilier, Prêt auto..."
        >
      </div>

      <div class="form-group">
        <label
          for="credit-lender"
          class="form-label"
        >Prêteur (optionnel)</label>
        <input
          id="credit-lender"
          v-model="credit.NomPreteur"
          type="text"
          class="form-input"
          placeholder="Ex: Crédit Agricole, BNP..."
        >
      </div>

      <div class="form-row">
        <div class="form-group">
          <label
            for="credit-initial-amount"
            class="form-label"
          >Montant initial</label>
          <input
            id="credit-initial-amount"
            v-model="credit.MontantInitial"
            type="number"
            class="form-input montant-positif"
            placeholder="0.00"
            step="0.01"
            min="0"
            @blur="blurMontantInitial"
          >
        </div>

        <div class="form-group">
          <label
            for="credit-monthly-amount"
            class="form-label"
          >Mensualité</label>
          <input
            id="credit-monthly-amount"
            v-model="montantMensuelAbsolute"
            type="number"
            class="form-input montant-negatif"
            placeholder="0.00"
            step="0.01"
            min="0"
            @blur="blurMontantMensuel"
          >
        </div>
      </div>

      <div class="form-group">
        <label
          for="credit-rate"
          class="form-label"
        >Taux d'intérêt (optionnel)</label>
        <div class="input-with-suffix">
          <input
            id="credit-rate"
            v-model="credit.TauxInteret"
            type="number"
            class="form-input"
            placeholder="0.00"
            step="0.01"
            min="0"
            max="100"
          >
          <span class="input-suffix">%</span>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label
            for="credit-start-date"
            class="form-label"
          >Date de début</label>
          <input
            id="credit-start-date"
            v-model="credit.DateDebut"
            type="date"
            class="form-input"
          >
        </div>

        <div class="form-group">
          <label
            for="credit-end-date"
            class="form-label"
          >Date de fin</label>
          <input
            id="credit-end-date"
            v-model="credit.DateFin"
            type="date"
            class="form-input"
          >
        </div>
      </div>

      <div class="form-group">
        <label
          for="credit-account"
          class="form-label"
        >Compte</label>
        <select
          id="credit-account"
          v-model="credit.IDcompte"
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
          for="credit-category"
          class="form-label"
        >Catégorie (optionnel)</label>
        <select
          id="credit-category"
          v-model="credit.IDcat"
          class="form-select"
        >
          <option value="">
            Aucune catégorie
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
        <label class="form-label">Statut</label>
        <div class="toggle-group">
          <button
            type="button"
            :class="[
              'toggle-btn',
              { active: credit.Statut === 'actif' },
            ]"
            @click="credit.Statut = 'actif'"
          >
            Actif
          </button>
          <button
            type="button"
            :class="[
              'toggle-btn',
              { active: credit.Statut === 'suspendu' },
            ]"
            @click="credit.Statut = 'suspendu'"
          >
            Suspendu
          </button>
          <button
            type="button"
            :class="[
              'toggle-btn',
              { active: credit.Statut === 'termine' },
            ]"
            @click="credit.Statut = 'termine'"
          >
            Terminé
          </button>
        </div>
      </div>

      <div class="form-actions">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!isFormValid"
          @click="updateCredit"
        >
          <span class="btn-icon">✓</span>
          {{ credit.IDcredit ? "Modifier" : "Créer" }}
        </button>

        <button
          v-if="credit.IDcredit"
          type="button"
          class="btn btn-danger"
          @click="deleteCredit"
        >
          <span class="btn-icon">🗑</span>
          Supprimer
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { useStore } from 'vuex'
  import { useRoute, useRouter } from 'vue-router'

  const store = useStore()
  const route = useRoute()
  const router = useRouter()

  const creditID = computed(() => Number(route.params.id))
  const accountList = computed(() => store.state.compte.accountList?.filter(account => account.visible) || [])
  const categoryList = computed(() => store.state.category.list || [])
  const activeAccountID = computed(() => store.state.compte.activeAccount?.IDcompte)

  const montantMensuelAbsolute = ref(0)

  const credit = ref({
    IDcredit: undefined as number | undefined,
    NomCredit: '',
    NomPreteur: '',
    MontantInitial: 0,
    MontantMensuel: 0,
    TauxInteret: null as number | null,
    DateDebut: new Date().toISOString().split('T')[0],
    DateFin: '',
    IDcompte: activeAccountID.value || '',
    IDcat: 0,
    Statut: 'actif'
  })

  const isFormValid = computed(() => {
    return (
      credit.value.NomCredit?.trim() &&
      credit.value.MontantInitial > 0 &&
      montantMensuelAbsolute.value > 0 &&
      credit.value.DateDebut &&
      credit.value.DateFin &&
      credit.value.IDcompte &&
      new Date(credit.value.DateFin) > new Date(credit.value.DateDebut)
    )
  })

  const blurMontantInitial = () => {
    if (credit.value.MontantInitial) {
      credit.value.MontantInitial = Math.round(credit.value.MontantInitial * 100) / 100
    }
  }

  const blurMontantMensuel = () => {
    if (montantMensuelAbsolute.value) {
      montantMensuelAbsolute.value = Math.round(montantMensuelAbsolute.value * 100) / 100
      credit.value.MontantMensuel = -Math.abs(montantMensuelAbsolute.value)
    }
  }

  const updateCredit = () => {
    if (!isFormValid.value) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    // Ensure MontantMensuel is negative
    credit.value.MontantMensuel = -Math.abs(montantMensuelAbsolute.value)

    // Convert dates to ISO format (date-time) for API
    const creditData = {
      ...credit.value,
      DateDebut: new Date(credit.value.DateDebut).toISOString(),
      DateFin: new Date(credit.value.DateFin).toISOString()
    }

    store.dispatch('updateCredit', creditData)
      .then(() => {
        router.push('/credits')
      })
      .catch((error) => {
        console.error('Error updating credit:', error)
        alert('Erreur lors de l\'enregistrement du crédit')
      })
  }

  const deleteCredit = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce crédit ?')) {
      store.dispatch('deleteCredit', credit.value)
        .then(() => {
          router.push('/credits')
        })
        .catch((error) => {
          console.error('Error deleting credit:', error)
          alert('Erreur lors de la suppression du crédit')
        })
    }
  }

  const handleBackdropClick = () => {
    router.push('/credits')
  }

  onMounted(() => {
    const nameInput = document.querySelector('#credit-name') as HTMLInputElement
    if (nameInput) nameInput.focus()

    if (creditID.value) {
      const existingCredit = store.getters.creditFromList(creditID.value)
      if (existingCredit) {
        credit.value = { ...existingCredit }
        credit.value.DateDebut = new Date(existingCredit.DateDebut).toISOString().split('T')[0]
        credit.value.DateFin = new Date(existingCredit.DateFin).toISOString().split('T')[0]
        montantMensuelAbsolute.value = Math.abs(existingCredit.MontantMensuel)
      }
    }
  })
</script>

<style scoped>
.credit-form {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  overflow-y: auto;
}

.form-card {
  background: var(--bg-card, #ffffff);
  border-radius: 16px;
  padding: 2rem;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl, 0 20px 60px rgba(0, 0, 0, 0.3));
}

.form-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary, #333);
  margin: 0 0 1.5rem 0;
  text-align: center;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-label {
  display: block;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary, #333);
  margin-bottom: 0.5rem;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  font-size: 1rem;
  color: var(--text-primary, #333);
  background: var(--bg-primary, #ffffff);
  transition: all 0.3s ease;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary-color, #667eea);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input-with-suffix {
  position: relative;
}

.input-with-suffix .form-input {
  padding-right: 2.5rem;
}

.input-suffix {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary, #666);
  font-weight: 500;
}

.montant-positif {
  border-color: var(--color-success, #4caf50);
}

.montant-negatif {
  border-color: var(--color-danger, #d32f2f);
}

.toggle-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.toggle-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  background: var(--bg-primary, #ffffff);
  color: var(--text-primary, #333);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.toggle-btn:hover {
  background: var(--bg-secondary, #f5f5f5);
}

.toggle-btn.active {
  background: var(--primary-color, #667eea);
  color: #ffffff;
  border-color: var(--primary-color, #667eea);
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn {
  flex: 1;
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg, 0 10px 20px rgba(0, 0, 0, 0.2));
}

.btn-danger {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: #ffffff;
}

.btn-danger:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg, 0 10px 20px rgba(0, 0, 0, 0.2));
}

.btn-icon {
  font-size: 1.125rem;
}

@media (max-width: 768px) {
  .form-card {
    padding: 1.5rem;
    max-height: 95vh;
  }

  .form-title {
    font-size: 1.5rem;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }

  .toggle-group {
    flex-direction: column;
  }
}
</style>
