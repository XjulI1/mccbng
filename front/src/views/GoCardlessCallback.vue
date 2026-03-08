<template>
  <div class="gc-callback">
    <div class="gc-callback-card">
      <div
        v-if="loading"
        class="gc-callback-loading"
      >
        <font-awesome-icon
          icon="redo"
          spin
        />
        <p>Vérification de la connexion bancaire...</p>
      </div>
      <div
        v-else-if="success"
        class="gc-callback-success"
      >
        <font-awesome-icon icon="check" />
        <p>Connexion bancaire réussie !</p>
        <p class="gc-callback-detail">
          {{ accountCount }} compte(s) découvert(s)
        </p>
        <button
          class="gc-callback-btn"
          @click="goToConfig"
        >
          Configurer les comptes
        </button>
      </div>
      <div
        v-else
        class="gc-callback-error"
      >
        <font-awesome-icon icon="times-circle" />
        <p>{{ errorMessage }}</p>
        <button
          class="gc-callback-btn"
          @click="goToConfig"
        >
          Retour aux paramètres
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useStore } from 'vuex'

  const route = useRoute()
  const router = useRouter()
  const store = useStore()

  const loading = ref(true)
  const success = ref(false)
  const errorMessage = ref('')
  const accountCount = ref(0)

  onMounted(async () => {
    const ref_param = route.query.ref as string

    if (!ref_param) {
      errorMessage.value = 'Paramètre de référence manquant'
      loading.value = false
      return
    }

    try {
      // The ref parameter is the requisition ID
      const status = await store.dispatch('checkRequisitionStatus', ref_param)

      if (status.status === 'LN') {
        success.value = true
        accountCount.value = status.accounts?.length || 0
      } else {
        errorMessage.value = `Statut de la connexion : ${status.status}. Veuillez réessayer.`
      }
    } catch (error: any) {
      errorMessage.value = error.response?.data?.error?.message || 'Erreur lors de la vérification'
    } finally {
      loading.value = false
    }
  })

  const goToConfig = () => {
    router.push('/config')
  }
</script>

<style lang="scss" scoped>
.gc-callback {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 140px);
  padding: var(--spacing-xl);
}

.gc-callback-card {
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-2xl) var(--spacing-2xl);
  box-shadow: var(--shadow-xl);
  border: var(--glass-border);
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.gc-callback-loading,
.gc-callback-success,
.gc-callback-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-lg);

  svg {
    font-size: 3rem;
  }

  p {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary);
  }
}

.gc-callback-loading svg {
  color: var(--color-info);
  animation: spin 1s linear infinite;
}

.gc-callback-success svg {
  color: var(--color-success);
}

.gc-callback-error svg {
  color: var(--color-danger);
}

.gc-callback-detail {
  font-size: 0.9rem !important;
  color: var(--text-muted) !important;
}

.gc-callback-btn {
  padding: 0.875rem var(--spacing-xl);
  border: none;
  border-radius: var(--radius-xl);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  background: linear-gradient(135deg, var(--color-info) 0%, var(--btn-info-hover) 100%);
  color: white;
  font-size: var(--font-size-base);
  transition: all var(--transition-normal);

  &:hover {
    transform: translateY(-2px);
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
