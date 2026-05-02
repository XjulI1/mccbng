<template>
  <div class="edit-user">
    <div class="form-card">
      <div class="form-header">
        <div class="header-icon">
          <font-awesome-icon icon="user-edit" />
        </div>
        <h2 class="form-title">
          Modifier mes informations
        </h2>
        <p class="form-subtitle">
          Mettez à jour les informations de votre compte
        </p>
      </div>

      <form
        class="form-body"
        @submit.prevent="submit"
      >
        <div class="form-group">
          <label
            for="user-username"
            class="form-label"
          >Nom d'utilisateur</label>
          <input
            id="user-username"
            v-model="form.username"
            type="text"
            class="form-input"
            placeholder="Votre nom d'utilisateur"
          >
        </div>

        <div class="form-group">
          <label
            for="user-email"
            class="form-label"
          >Email</label>
          <input
            id="user-email"
            v-model="form.email"
            type="email"
            class="form-input"
            placeholder="vous@exemple.com"
            required
          >
        </div>

        <div class="form-row">
          <div class="form-group">
            <label
              for="user-warning-total"
              class="form-label"
            >Seuil d'alerte total</label>
            <input
              id="user-warning-total"
              v-model.number="form.warningTotal"
              type="number"
              class="form-input"
              step="0.01"
              placeholder="0"
            >
          </div>

          <div class="form-group">
            <label
              for="user-warning-compte"
              class="form-label"
            >Seuil d'alerte par compte</label>
            <input
              id="user-warning-compte"
              v-model.number="form.warningCompte"
              type="number"
              class="form-input"
              step="0.01"
              placeholder="0"
            >
          </div>
        </div>

        <div class="form-group">
          <label
            for="user-favoris"
            class="form-label"
          >Compte favori</label>
          <select
            id="user-favoris"
            v-model="form.favoris"
            class="form-input"
          >
            <option :value="null">
              Aucun
            </option>
            <option
              v-for="account in accountList"
              :key="'favoris-' + account.IDcompte"
              :value="account.IDcompte"
            >
              {{ account.NomCompte }}
            </option>
          </select>
        </div>

        <div
          v-if="errorMessage"
          class="form-error"
        >
          <font-awesome-icon icon="exclamation-circle" />
          {{ errorMessage }}
        </div>

        <div
          v-if="successMessage"
          class="form-success"
        >
          <font-awesome-icon icon="check-circle" />
          {{ successMessage }}
        </div>

        <p class="form-info">
          <font-awesome-icon icon="info-circle" />
          La modification du code d'accès sera disponible prochainement.
        </p>

        <div class="form-actions">
          <button
            type="button"
            class="btn btn-secondary"
            @click="cancel"
          >
            Annuler
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="isSubmitting || !isFormValid"
          >
            <font-awesome-icon
              v-if="isSubmitting"
              icon="spinner"
              spin
            />
            <font-awesome-icon
              v-else
              icon="save"
            />
            {{ isSubmitting ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useStore } from 'vuex'

  const store = useStore()
  const router = useRouter()

  const form = reactive({
    username: '' as string,
    email: '' as string,
    warningTotal: null as number | null,
    warningCompte: null as number | null,
    favoris: null as number | null
  })

  const accountList = computed(() =>
    (store.state.compte.accountList || []).filter((account) => account.visible)
  )

  const isSubmitting = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')

  const isFormValid = computed(() => {
    return form.email && form.email.trim().length > 0
  })

  const loadUser = () => {
    form.username = store.state.user.username || ''
    form.email = store.state.user.email || ''
    form.warningTotal = store.state.user.warningTotal
    form.warningCompte = store.state.user.warningCompte
    form.favoris = store.state.user.favoris ?? null
  }

  onMounted(() => {
    store.commit('setActiveAccount', { NomCompte: 'Mon compte' })

    if (store.state.user.email) {
      loadUser()
    } else if (store.state.user.id) {
      store.dispatch('fetchUser', store.state.user.id).then(loadUser)
    }
  })

  const submit = async () => {
    errorMessage.value = ''
    successMessage.value = ''
    if (!isFormValid.value) return

    isSubmitting.value = true
    try {
      await store.dispatch('updateUser', {
        username: form.username || undefined,
        email: form.email,
        warningTotal: form.warningTotal,
        warningCompte: form.warningCompte,
        favoris: form.favoris
      })
      successMessage.value = 'Vos informations ont été mises à jour.'
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        errorMessage.value = 'Cet email est déjà utilisé par un autre compte.'
      } else {
        errorMessage.value = 'Impossible de mettre à jour vos informations. Veuillez réessayer.'
      }
    } finally {
      isSubmitting.value = false
    }
  }

  const cancel = () => {
    router.push('/config')
  }
</script>

<style lang="scss" scoped>
.edit-user {
  max-width: 700px;
  margin: 0 auto;
  padding: var(--spacing-2xl) var(--spacing-lg);
}

.form-card {
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-2xl);
  box-shadow: var(--shadow-xl);
  border: var(--glass-border);
}

.form-header {
  text-align: center;
  margin-bottom: var(--spacing-2xl);

  .header-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto var(--spacing-lg);
    border-radius: 50%;
    background: var(--primary-gradient);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.5rem;
    box-shadow: var(--shadow-glass);
  }

  .form-title {
    font-size: 1.5rem;
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
    margin: 0 0 var(--spacing-sm) 0;
  }

  .form-subtitle {
    color: var(--text-muted);
    font-size: 0.95rem;
    margin: 0;
  }
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.form-label {
  font-size: 0.9rem;
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  font-size: 1rem;
  color: var(--text-primary);
  background: var(--bg-primary);
  transition: all var(--transition-normal);

  &:focus {
    outline: none;
    border-color: var(--color-primary, #667eea);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
  }
}

.form-error,
.form-success {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 0.75rem 1rem;
  border-radius: var(--radius-lg);
  font-size: 0.9rem;
  font-weight: var(--font-weight-medium);
}

.form-error {
  color: var(--color-danger-dark);
  background: var(--bg-danger-light);
  border: 1px solid rgba(254, 178, 178, 0.4);
}

.form-success {
  color: #1f7a3a;
  background: rgba(40, 167, 69, 0.12);
  border: 1px solid rgba(40, 167, 69, 0.3);
}

.form-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--text-muted);
  font-size: 0.85rem;
  margin: 0;
}

.form-actions {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);

  @media (max-width: 600px) {
    flex-direction: column-reverse;
  }
}

.btn {
  flex: 1;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: var(--radius-xl);
  font-size: 1rem;
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-smooth);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &.btn-primary {
    background: var(--primary-gradient);
    color: white;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: var(--shadow-btn);
    }
  }

  &.btn-secondary {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 2px solid var(--border-color);

    &:hover {
      background: var(--bg-muted);
    }
  }
}
</style>
