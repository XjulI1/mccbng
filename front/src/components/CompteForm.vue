<template>
  <div
    v-if="compte"
    class="compte-form"
    @click="handleBackdropClick"
    @keypress.enter="saveCompte"
  >
    <div
      class="form-card"
      @click.stop
    >
      <h2 class="form-title">
        {{ compte.IDcompte ? "Modifier le compte" : "Nouveau compte" }}
      </h2>

      <div class="form-group">
        <label
          for="compte-name"
          class="form-label"
        >Nom du compte</label>
        <input
          id="compte-name"
          v-model="compte.NomCompte"
          type="text"
          class="form-input"
          placeholder="Ex: Compte courant, Livret A..."
        >
      </div>

      <div class="form-group">
        <label
          for="compte-banque"
          class="form-label"
        >Banque</label>
        <div
          v-if="!showNewBanque"
          class="banque-row"
        >
          <select
            id="compte-banque"
            v-model="compte.IDbanque"
            class="form-select"
          >
            <option
              :value="undefined"
              disabled
            >
              Sélectionnez une banque
            </option>
            <option
              v-for="banque in banqueList"
              :key="'banque-' + banque.IDbanque"
              :value="banque.IDbanque"
            >
              {{ banque.NomBanque }}
            </option>
          </select>
          <button
            type="button"
            class="btn-inline"
            @click="openNewBanque"
          >
            + Nouvelle
          </button>
        </div>
        <div
          v-else
          class="banque-row"
        >
          <input
            ref="newBanqueInputRef"
            v-model="newBanqueName"
            type="text"
            class="form-input"
            placeholder="Nom de la nouvelle banque"
            @keypress.enter.stop="confirmNewBanque"
          >
          <button
            type="button"
            class="btn-inline"
            :disabled="!newBanqueName.trim() || creatingBanque"
            @click="confirmNewBanque"
          >
            ✓
          </button>
          <button
            type="button"
            class="btn-inline btn-inline-cancel"
            @click="cancelNewBanque"
          >
            ✕
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Type de compte</label>
        <div class="toggle-grid">
          <button
            type="button"
            :class="['toggle-btn', { active: compte.bloque }]"
            @click="compte.bloque = !compte.bloque"
          >
            🔒 Bloqué
          </button>
          <button
            type="button"
            :class="['toggle-btn', { active: compte.joint }]"
            @click="compte.joint = !compte.joint"
          >
            🤝 Joint
          </button>
          <button
            type="button"
            :class="['toggle-btn', { active: compte.children }]"
            @click="compte.children = !compte.children"
          >
            👶 Enfant
          </button>
          <button
            type="button"
            :class="['toggle-btn', { active: compte.retraite }]"
            @click="compte.retraite = !compte.retraite"
          >
            🏦 Retraite
          </button>
          <button
            type="button"
            :class="['toggle-btn', { active: compte.porte_feuille }]"
            @click="compte.porte_feuille = !compte.porte_feuille"
          >
            💰 Portefeuille
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Visibilité</label>
        <div class="toggle-group">
          <button
            type="button"
            :class="['toggle-btn', { active: compte.visible }]"
            @click="compte.visible = true"
          >
            👁 Visible
          </button>
          <button
            type="button"
            :class="['toggle-btn', { active: !compte.visible }]"
            @click="compte.visible = false"
          >
            🚫 Masqué
          </button>
        </div>
      </div>

      <div class="form-actions">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!isFormValid"
          @click="saveCompte"
        >
          <span class="btn-icon">✓</span>
          {{ compte.IDcompte ? "Modifier" : "Créer" }}
        </button>

        <button
          v-if="compte.IDcompte"
          type="button"
          class="btn btn-danger"
          :disabled="hasReferences"
          :title="hasReferences ? 'Des opérations / récurrences / crédits sont rattachés à ce compte. Masquez-le plutôt.' : ''"
          @click="removeCompte"
        >
          <span class="btn-icon">🗑</span>
          Supprimer
        </button>
      </div>

      <p
        v-if="compte.IDcompte && hasReferences"
        class="form-note"
      >
        Suppression impossible : ce compte est référencé par des opérations,
        opérations récurrentes ou crédits. Pour le retirer de la liste,
        passez-le en « Masqué ».
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, nextTick } from 'vue'
  import { useStore } from 'vuex'
  import { useRoute, useRouter } from 'vue-router'

  const store = useStore()
  const route = useRoute()
  const router = useRouter()

  const compteID = computed(() => Number(route.params.id))
  const banqueList = computed(() => store.state.banque.banqueList || [])
  const managementInfo = computed(() => store.state.compte.managementInfo || [])

  const showNewBanque = ref(false)
  const newBanqueName = ref('')
  const creatingBanque = ref(false)
  const newBanqueInputRef = ref<HTMLInputElement | null>(null)

  const compte = ref({
    IDcompte: undefined as number | undefined,
    NomCompte: '',
    IDbanque: undefined as number | undefined,
    bloque: false,
    joint: false,
    children: false,
    retraite: false,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    porte_feuille: false,
    visible: true
  })

  const isFormValid = computed(() => {
    return Boolean(
      compte.value.NomCompte?.trim() &&
        compte.value.IDbanque
    )
  })

  const hasReferences = computed(() => {
    if (!compte.value.IDcompte) return false
    const info = managementInfo.value.find(
      (i) => i.IDcompte === compte.value.IDcompte
    )
    return info?.hasReferences ?? false
  })

  const openNewBanque = async () => {
    showNewBanque.value = true
    newBanqueName.value = ''
    await nextTick()
    newBanqueInputRef.value?.focus()
  }

  const cancelNewBanque = () => {
    showNewBanque.value = false
    newBanqueName.value = ''
  }

  const confirmNewBanque = () => {
    const name = newBanqueName.value.trim()
    if (!name || creatingBanque.value) return

    creatingBanque.value = true
    store.dispatch('createBanque', { NomBanque: name })
      .then((created) => {
        compte.value.IDbanque = created.IDbanque
        showNewBanque.value = false
        newBanqueName.value = ''
      })
      .catch((error) => {
        console.error('Error creating banque:', error)
        alert('Erreur lors de la création de la banque')
      })
      .finally(() => {
        creatingBanque.value = false
      })
  }

  const returnToList = () => {
    router.push('/comptesGestion')
  }

  const saveCompte = () => {
    if (!isFormValid.value) {
      alert('Veuillez renseigner le nom du compte et choisir une banque')
      return
    }

    const action = compte.value.IDcompte ? 'updateCompte' : 'createCompte'
    store.dispatch(action, { ...compte.value })
      .then(() => {
        returnToList()
      })
      .catch((error) => {
        console.error('Error saving compte:', error)
        const message = error?.response?.data?.error?.message
        alert(message || 'Erreur lors de l\'enregistrement du compte')
      })
  }

  const removeCompte = () => {
    if (hasReferences.value) return
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce compte ?')) return

    store.dispatch('deleteCompte', compte.value)
      .then(() => {
        returnToList()
      })
      .catch((error) => {
        console.error('Error deleting compte:', error)
        const message = error?.response?.data?.error?.message
        alert(message || 'Erreur lors de la suppression du compte')
      })
  }

  const handleBackdropClick = () => {
    returnToList()
  }

  onMounted(() => {
    store.dispatch('fetchBanques')

    if (compteID.value) {
      store.dispatch('fetchComptesManagementInfo')
      const existing = store.getters.getAccount(compteID.value)
      if (existing) {
        compte.value = {
          IDcompte: existing.IDcompte,
          NomCompte: existing.NomCompte,
          IDbanque: existing.IDbanque,
          bloque: !!existing.bloque,
          joint: !!existing.joint,
          children: !!existing.children,
          retraite: !!existing.retraite,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          porte_feuille: !!existing.porte_feuille,
          visible: existing.visible !== false
        }
      }
    }

    nextTick(() => {
      const nameInput = document.querySelector('#compte-name') as HTMLInputElement
      if (nameInput) nameInput.focus()
    })
  })
</script>

<style scoped>
.compte-form {
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

.banque-row {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.banque-row .form-select,
.banque-row .form-input {
  flex: 1;
}

.btn-inline {
  padding: 0 0.75rem;
  border: 2px solid var(--primary-color, #667eea);
  border-radius: 8px;
  background: var(--bg-primary, #ffffff);
  color: var(--primary-color, #667eea);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.btn-inline:hover:not(:disabled) {
  background: var(--primary-color, #667eea);
  color: #ffffff;
}

.btn-inline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-inline-cancel {
  border-color: var(--border-color, #e0e0e0);
  color: var(--text-secondary, #666);
}

.btn-inline-cancel:hover {
  background: var(--border-color, #e0e0e0);
  color: var(--text-primary, #333);
}

.toggle-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.toggle-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
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

.btn-danger:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg, 0 10px 20px rgba(0, 0, 0, 0.2));
}

.btn-icon {
  font-size: 1.125rem;
}

.form-note {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary, #fff8e6);
  border-left: 3px solid var(--color-warning, #f0ad4e);
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--text-secondary, #666);
}

@media (max-width: 768px) {
  .form-card {
    padding: 1.5rem;
    max-height: 95vh;
  }

  .form-title {
    font-size: 1.5rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .toggle-grid {
    grid-template-columns: 1fr;
  }
}
</style>
