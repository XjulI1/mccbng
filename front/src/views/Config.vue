<template>
  <div class="config">
    <div class="config-header">
      <div class="config-icon">
        <svg viewBox="0 0 24 24" fill="currentColor" class="gear-icon">
          <path
            d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11.03L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11.03C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"
          />
        </svg>
      </div>
      <h1 class="config-title">Configurations</h1>
      <p class="config-subtitle">Personnalisez votre expérience</p>
    </div>

    <div class="config-cards">
      <div class="config-card">
        <div class="card-header">
          <div class="card-icon reload-icon">
            <font-awesome-icon icon="redo" />
          </div>
          <div class="card-content">
            <h3 class="card-title">Recharger l'application</h3>
            <p class="card-description">
              Actualiser et recharger complètement l'application
            </p>
          </div>
        </div>
        <a class="config-btn primary-btn" href="/">
          <font-awesome-icon icon="redo" />
          Recharger
        </a>
      </div>

      <div class="config-card">
        <div class="card-header">
          <div class="card-icon privacy-icon">
            <font-awesome-icon icon="money-bill" />
          </div>
          <div class="card-content">
            <h3 class="card-title">Confidentialité</h3>
            <p class="card-description">
              Masquer ou afficher les montants dans l'interface
            </p>
          </div>
        </div>
        <button class="config-btn warning-btn" @click="toggleAmount">
          <font-awesome-icon icon="money-bill" />
          {{ maskAmountText }}
        </button>
      </div>

      <div class="config-card">
        <div class="card-header">
          <div class="card-icon stats-icon">
            <font-awesome-icon icon="chart-area" />
          </div>
          <div class="card-content">
            <h3 class="card-title">Affichage des statistiques</h3>
            <p class="card-description">
              Activer le zoom sur l'évolution du solde
            </p>
          </div>
        </div>
        <button class="config-btn success-btn" @click="toggleZoomStats">
          <font-awesome-icon icon="search-plus" />
          {{ zoomStatsText }}
        </button>
      </div>
    </div>

    <div class="config-footer">
      <div class="api-info">
        <div class="api-label">URL de l'API</div>
        <div class="api-url">{{ apiURL }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from "vue";
import { useStore } from "vuex";

const store = useStore();

const apiURL = import.meta.env.VITE_API_URL;

// Computed properties pour les textes dynamiques
const maskAmountText = computed(() => {
  return store.state.maskAmount
    ? "Afficher les montants"
    : "Masquer les montants";
});

const zoomStatsText = computed(() => {
  return store.state.zoomStats ? "Désactiver le zoom" : "Activer le zoom";
});

onMounted(() => {
  store.commit("setActiveAccount", { NomCompte: "Configurations" });
});

const toggleAmount = (event: Event) => {
  store.dispatch("toggleMaskAmount");
  if (event.target instanceof HTMLElement) {
    event.target.blur();
  }
};

const toggleZoomStats = (event: Event) => {
  store.dispatch("toggleZoomStats");
  if (event.target instanceof HTMLElement) {
    event.target.blur();
  }
};
</script>
<style lang="scss" scoped>
.config {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
  min-height: calc(100vh - 140px);
}

.config-header {
  text-align: center;
  margin-bottom: 3rem;

  .config-icon {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);

    .gear-icon {
      width: 2.5rem;
      height: 2.5rem;
      color: white;
    }
  }

  .config-title {
    color: #2d3748;
    line-height: 2.3rem;
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    letter-spacing: -0.5px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .config-subtitle {
    color: #718096;
    font-size: 1.1rem;
    margin: 0;
    font-weight: 400;
  }
}

.config-cards {
  display: grid;
  gap: 1.5rem;
  margin-bottom: 3rem;

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
