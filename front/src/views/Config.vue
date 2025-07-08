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
  padding: 2rem 1rem;
  min-height: calc(100vh - 140px);
}

.config-cards {
  display: grid;
  gap: 1.5rem;
  margin-bottom: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  }
}

.config-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 2rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
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
    gap: 1rem;
    margin-bottom: 1.5rem;

    .card-icon {
      width: 50px;
      height: 50px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
      transition: all 0.3s ease;

      &.reload-icon {
        background: rgba(23, 162, 184, 0.1);
        color: #17a2b8;
      }

      &.privacy-icon {
        background: rgba(255, 193, 7, 0.1);
        color: #ffc107;
      }

      &.stats-icon {
        background: rgba(40, 167, 69, 0.1);
        color: #28a745;
      }

      &.logout-icon {
        background: rgba(220, 53, 69, 0.1);
        color: #dc3545;
      }
    }

    .card-content {
      flex: 1;

      .card-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #2d3748;
        margin: 0 0 0.5rem 0;
        line-height: 1.2;
      }

      .card-description {
        color: #718096;
        font-size: 0.95rem;
        margin: 0;
        line-height: 1.4;
      }
    }
  }

  .config-btn {
    width: 100%;
    padding: 0.875rem 1.5rem;
    border: none;
    border-radius: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    font-size: 1rem;
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
      background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
      color: white;
    }

    &.warning-btn {
      background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%);
      color: #212529;
    }

    &.success-btn {
      background: linear-gradient(135deg, #28a745 0%, #218838 100%);
      color: white;
    }

    &.danger-btn {
      background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
      color: white;

      &:hover {
        box-shadow: 0 8px 25px rgba(220, 53, 69, 0.4);
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
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  text-align: center;

  .api-info {
    .api-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
    }

    .api-url {
      font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
      background: #f7fafc;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      border: 2px solid #e2e8f0;
      color: #4a5568;
      font-size: 0.875rem;
      word-break: break-all;
      transition: all 0.3s ease;

      &:hover {
        border-color: #cbd5e0;
        background: #edf2f7;
      }
    }
  }
}

@media (max-width: 768px) {
  .config {
    padding: 1rem 0.5rem;
  }

  .config-header {
    margin-bottom: 2rem;

    .config-title {
      font-size: 1.5rem;
    }

    .config-icon {
      width: 60px;
      height: 60px;
      margin-bottom: 1rem;

      .gear-icon {
        width: 1.8rem;
        height: 1.8rem;
      }
    }
  }

  .config-card {
    padding: 1.5rem;

    .card-header {
      flex-direction: column;
      text-align: center;
      align-items: center;

      .card-icon {
        margin-bottom: 0.5rem;
      }
    }
  }
}
</style>
