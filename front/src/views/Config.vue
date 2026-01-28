<template>
  <div class="config">
    <div class="config-cards">
      <div class="config-card">
        <div class="card-header">
          <div class="card-icon reload-icon">
            <font-awesome-icon icon="redo" />
          </div>
          <div class="card-content">
            <h3 class="card-title">
              Recharger l'application
            </h3>
            <p class="card-description">
              Actualiser et recharger complètement l'application
            </p>
          </div>
        </div>
        <a
          class="config-btn primary-btn"
          href="/"
        >
          <font-awesome-icon icon="redo" />
          Recharger
        </a>
      </div>

      <div class="config-card">
        <div class="card-header">
          <div class="card-icon privacy-icon">
            <font-awesome-icon icon="eye-slash" />
          </div>
          <div class="card-content">
            <h3 class="card-title">
              Confidentialité
            </h3>
            <p class="card-description">
              Masquer ou afficher les montants dans l'interface
            </p>
          </div>
        </div>
        <button
          class="config-btn warning-btn"
          @click="toggleAmount"
        >
          <font-awesome-icon icon="money-bill" />
          {{ maskAmountText }}
        </button>
      </div>

      <div class="config-card logout-card">
        <div class="card-header">
          <div class="card-icon logout-icon">
            <font-awesome-icon icon="sign-out-alt" />
          </div>
          <div class="card-content">
            <h3 class="card-title">
              Déconnexion
            </h3>
            <p class="card-description">
              Se déconnecter de l'application et revenir à l'écran de connexion
            </p>
          </div>
        </div>
        <button
          class="config-btn danger-btn"
          @click="logout"
        >
          <font-awesome-icon icon="sign-out-alt" />
          Se déconnecter
        </button>
      </div>
    </div>

    <div class="config-footer">
      <div class="api-info">
        <div class="api-label">
          URL de l'API
        </div>
        <div class="api-url">
          {{ apiURL }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, computed } from 'vue'
  import { useStore } from 'vuex'
  import { removeCookies } from '@/services/auth'

  const store = useStore()

  const apiURL = import.meta.env.VITE_API_URL

  // Computed properties pour les textes dynamiques
  const maskAmountText = computed(() => {
    return store.state.maskAmount
      ? 'Afficher les montants'
      : 'Masquer les montants'
  })

  onMounted(() => {
    store.commit('setActiveAccount', { NomCompte: 'Configurations' })
  })

  const toggleAmount = (event: Event) => {
    store.dispatch('toggleMaskAmount')
    if (event.target instanceof HTMLElement) {
      event.target.blur()
    }
  }

  const logout = () => {
    localStorage.clear()
    sessionStorage.clear()
    removeCookies()
    window.location.reload()
  }
</script>
<style lang="scss" scoped>
.config {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-2xl) var(--spacing-lg);
  min-height: calc(100vh - 140px);
}

.config-cards {
  display: grid;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  }
}

.config-card {
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-2xl);
  box-shadow: var(--shadow-xl);
  border: var(--glass-border);
  transition: all var(--transition-smooth);
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--primary-gradient);
    background-size: 200% 100%;
    animation: gradient 3s ease infinite;
  }

  &:hover {
    transform: translateY(-8px);
  }

  &.logout-card {
    border: 1px solid rgba(220, 53, 69, 0.1);
  }

  .card-header {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);

    .card-icon {
      width: 50px;
      height: 50px;
      border-radius: var(--radius-xl);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
      transition: all var(--transition-normal);

      &.reload-icon {
        background: rgba(23, 162, 184, 0.1);
        color: var(--color-info);
      }

      &.privacy-icon {
        background: rgba(255, 193, 7, 0.1);
        color: var(--color-warning);
      }

      &.stats-icon {
        background: rgba(40, 167, 69, 0.1);
        color: var(--color-success);
      }

      &.logout-icon {
        background: rgba(220, 53, 69, 0.1);
        color: var(--color-danger);
      }
    }

    .card-content {
      flex: 1;

      .card-title {
        font-size: 1.25rem;
        font-weight: var(--font-weight-semibold);
        color: var(--text-primary);
        margin: 0 0 var(--spacing-sm) 0;
        line-height: 1.2;
      }

      .card-description {
        color: var(--text-muted);
        font-size: 0.95rem;
        margin: 0;
        line-height: 1.4;
      }
    }
  }

  .config-btn {
    width: 100%;
    padding: 0.875rem var(--spacing-xl);
    border: none;
    border-radius: var(--radius-xl);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: all var(--transition-smooth);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    font-size: var(--font-size-base);
    text-decoration: none;
    position: relative;
    overflow: hidden;

    svg {
      font-size: 1.1rem;
    }

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.2),
        transparent
      );
      transition: left 0.5s;
    }

    &:hover::before {
      left: 100%;
    }

    &:hover {
      transform: translateY(-2px);
    }

    &.primary-btn {
      background: linear-gradient(135deg, var(--color-info) 0%, var(--btn-info-hover) 100%);
      color: white;
    }

    &.warning-btn {
      background: var(--warning-gradient);
      color: var(--text-primary);
    }

    &.success-btn {
      background: var(--success-gradient);
      color: white;
    }

    &.danger-btn {
      background: var(--danger-gradient);
      color: white;

      &:hover {
        box-shadow: var(--shadow-btn);
      }
    }
  }
}

@keyframes gradient {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.config-footer {
  background: var(--bg-glass-dark);
  backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  border: var(--glass-border);
  text-align: center;

  .api-info {
    .api-label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: var(--spacing-sm);
    }

    .api-url {
      font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
      background: var(--bg-secondary);
      padding: 0.75rem var(--spacing-lg);
      border-radius: var(--radius-lg);
      border: 2px solid var(--border-color);
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
      word-break: break-all;
      transition: all var(--transition-normal);

      &:hover {
        border-color: var(--text-muted);
        background: var(--bg-muted);
      }
    }
  }
}

@media (max-width: 768px) {
  .config {
    padding: var(--spacing-lg) var(--spacing-sm);
  }

  .config-header {
    margin-bottom: var(--spacing-2xl);

    .config-title {
      font-size: var(--font-size-2xl);
    }

    .config-icon {
      width: 60px;
      height: 60px;
      margin-bottom: var(--spacing-lg);

      .gear-icon {
        width: 1.8rem;
        height: 1.8rem;
      }
    }
  }

  .config-card {
    padding: var(--spacing-xl);

    .card-header {
      flex-direction: column;
      text-align: center;
      align-items: center;

      .card-icon {
        margin-bottom: var(--spacing-sm);
      }
    }
  }
}
</style>
