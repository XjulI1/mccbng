<template>
  <div
    v-if="bien"
    class="bien-form"
    @click="handleBackdropClick"
    @keypress.enter="saveBien"
  >
    <div
      class="form-card"
      @click.stop
    >
      <h2 class="form-title">
        {{ bien.IDbien ? "Modifier le bien" : "Nouveau bien" }}
      </h2>

      <div class="form-group">
        <label
          for="bien-name"
          class="form-label"
        >Nom du bien</label>
        <input
          id="bien-name"
          v-model="bien.NomBien"
          type="text"
          class="form-input"
          placeholder="Ex: Appartement Lyon 3..."
        >
      </div>

      <div class="form-row">
        <div class="form-group">
          <label
            for="bien-city"
            class="form-label"
          >Ville</label>
          <input
            id="bien-city"
            v-model="bien.Ville"
            type="text"
            class="form-input"
            placeholder="Ex: Lyon"
          >
        </div>

        <div class="form-group">
          <label
            for="bien-type"
            class="form-label"
          >Type de bien</label>
          <select
            id="bien-type"
            v-model="bien.TypeBien"
            class="form-select"
          >
            <option value="appartement">
              Appartement
            </option>
            <option value="maison">
              Maison
            </option>
            <option value="terrain">
              Terrain
            </option>
            <option value="parking">
              Parking
            </option>
            <option value="local">
              Local commercial
            </option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label
            for="bien-surface"
            class="form-label"
          >Surface (m²)</label>
          <input
            id="bien-surface"
            v-model.number="bien.Surface"
            type="number"
            class="form-input"
            placeholder="0"
            step="0.01"
            min="0"
          >
        </div>

        <div class="form-group">
          <label
            for="bien-usage"
            class="form-label"
          >Usage</label>
          <select
            id="bien-usage"
            v-model="bien.Usage"
            class="form-select"
          >
            <option value="principale">
              Résidence principale
            </option>
            <option value="secondaire">
              Résidence secondaire
            </option>
            <option value="locatif">
              Locatif
            </option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label
          for="bien-date"
          class="form-label"
        >Date d'achat</label>
        <input
          id="bien-date"
          v-model="bien.DateAchat"
          type="date"
          class="form-input"
        >
      </div>

      <fieldset class="form-fieldset">
        <legend>Prix d'achat</legend>

        <div class="form-row">
          <div class="form-group">
            <label
              for="bien-prix-nu"
              class="form-label"
            >Prix du bien nu</label>
            <input
              id="bien-prix-nu"
              v-model.number="bien.PrixBienNu"
              type="number"
              class="form-input"
              placeholder="0.00"
              step="0.01"
              min="0"
              @blur="roundField('PrixBienNu')"
            >
          </div>

          <div class="form-group">
            <label
              for="bien-frais-notaire"
              class="form-label"
            >Frais de notaire</label>
            <input
              id="bien-frais-notaire"
              v-model.number="bien.FraisNotaire"
              type="number"
              class="form-input"
              placeholder="0.00"
              step="0.01"
              min="0"
              @blur="roundField('FraisNotaire')"
            >
          </div>
        </div>

        <div class="form-group">
          <label
            for="bien-frais-agence"
            class="form-label"
          >Frais d'agence (optionnel)</label>
          <input
            id="bien-frais-agence"
            v-model.number="bien.FraisAgence"
            type="number"
            class="form-input"
            placeholder="0.00"
            step="0.01"
            min="0"
            @blur="roundField('FraisAgence')"
          >
        </div>

        <div class="prix-total">
          <span class="prix-total-label">Total</span>
          <span class="prix-total-value">{{ formatAmount(prixTotal) }}</span>
        </div>
      </fieldset>

      <fieldset class="form-fieldset">
        <legend>Financement</legend>

        <div class="form-group">
          <label
            for="bien-credit"
            class="form-label"
          >Crédit associé (optionnel)</label>
          <select
            id="bien-credit"
            v-model="bien.IDcredit"
            class="form-select"
          >
            <option :value="null">
              Aucun crédit
            </option>
            <option
              v-for="credit in creditList"
              :key="'credit-' + credit.IDcredit"
              :value="credit.IDcredit"
            >
              {{ credit.NomCredit }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label
            for="bien-apport"
            class="form-label"
          >Apport en cash (optionnel)</label>
          <input
            id="bien-apport"
            v-model.number="bien.ApportCash"
            type="number"
            class="form-input"
            placeholder="0.00"
            step="0.01"
            min="0"
            @blur="roundField('ApportCash')"
          >
        </div>
      </fieldset>

      <div class="form-group">
        <label
          for="bien-valeur"
          class="form-label"
        >Valeur estimée actuelle (optionnel)</label>
        <input
          id="bien-valeur"
          v-model.number="bien.ValeurActuelle"
          type="number"
          class="form-input"
          placeholder="0.00"
          step="0.01"
          min="0"
          @blur="roundField('ValeurActuelle')"
        >
      </div>

      <div class="form-actions">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!isFormValid"
          @click="saveBien"
        >
          <span class="btn-icon">✓</span>
          {{ bien.IDbien ? "Modifier" : "Créer" }}
        </button>

        <button
          v-if="bien.IDbien"
          type="button"
          class="btn btn-danger"
          @click="removeBien"
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

  const bienID = computed(() => Number(route.params.id))
  const creditList = computed(() => store.state.credit.creditList || [])

  const bien = ref({
    IDbien: undefined as number | undefined,
    NomBien: '',
    Ville: '',
    TypeBien: 'appartement',
    Surface: null as number | null,
    Usage: 'principale',
    DateAchat: new Date().toISOString().split('T')[0],
    PrixBienNu: 0,
    FraisNotaire: 0,
    FraisAgence: 0,
    ApportCash: 0,
    ValeurActuelle: null as number | null,
    IDcredit: null as number | null
  })

  const prixTotal = computed(() => {
    return (
      (Number(bien.value.PrixBienNu) || 0) +
      (Number(bien.value.FraisNotaire) || 0) +
      (Number(bien.value.FraisAgence) || 0)
    )
  })

  const isFormValid = computed(() => {
    return (
      bien.value.NomBien?.trim() &&
      bien.value.Ville?.trim() &&
      bien.value.TypeBien &&
      bien.value.Usage &&
      bien.value.DateAchat &&
      Number(bien.value.PrixBienNu) > 0 &&
      Number(bien.value.FraisNotaire) >= 0
    )
  })

  const roundField = (field: string) => {
    const value = bien.value[field]
    if (value !== null && value !== undefined && value !== '') {
      bien.value[field] = Math.round(Number(value) * 100) / 100
    }
  }

  const formatAmount = (amount: number) => {
    if (amount === undefined || amount === null) return '0,00 €'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const saveBien = () => {
    if (!isFormValid.value) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    const bienData = {
      ...bien.value,
      DateAchat: new Date(bien.value.DateAchat).toISOString(),
      Surface: bien.value.Surface || undefined,
      ValeurActuelle: bien.value.ValeurActuelle || undefined,
      IDcredit: bien.value.IDcredit || undefined
    }

    store.dispatch('updateBien', bienData)
      .then(() => {
        router.push('/biens')
      })
      .catch((error) => {
        console.error('Error updating bien:', error)
        alert('Erreur lors de l\'enregistrement du bien')
      })
  }

  const removeBien = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce bien ?')) {
      store.dispatch('deleteBien', bien.value)
        .then(() => {
          router.push('/biens')
        })
        .catch((error) => {
          console.error('Error deleting bien:', error)
          alert('Erreur lors de la suppression du bien')
        })
    }
  }

  const handleBackdropClick = () => {
    router.push('/biens')
  }

  onMounted(() => {
    if (creditList.value.length === 0) {
      store.dispatch('fetchCredits')
    }

    const nameInput = document.querySelector('#bien-name') as HTMLInputElement
    if (nameInput) nameInput.focus()

    if (bienID.value) {
      const existing = store.getters.bienFromList(bienID.value)
      if (existing) {
        bien.value = { ...existing }
        bien.value.DateAchat = new Date(existing.DateAchat).toISOString().split('T')[0]
      }
    }
  })
</script>

<style scoped>
.bien-form {
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

.form-fieldset {
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.25rem;
}

.form-fieldset legend {
  padding: 0 0.5rem;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.prix-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border-color, #e0e0e0);
  font-weight: 600;
}

.prix-total-label {
  color: var(--text-secondary, #666);
}

.prix-total-value {
  color: var(--text-primary, #333);
  font-size: 1.125rem;
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
}
</style>
