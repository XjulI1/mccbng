<template>
  <div
    class="amortissement-card"
    @click="toggleDetails"
  >
    <div class="card-header">
      <div class="operation-info">
        <h3 class="operation-title">
          {{ operation.NomOp }}
        </h3>
        <div class="operation-date">
          <span class="date-icon">📅</span>
          {{
            new Date(operation.DateOp).toLocaleDateString("fr-FR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          }}
        </div>
      </div>
      <div class="header-price">
        <div class="price-display">
          <span class="price-label">Prix total</span>
          <span class="price-value">{{ formatPrice(montantTotal) }}€</span>
        </div>
      </div>
      <div class="actions">
        <button
          v-if="showDetails"
          class="simulator-btn"
          :class="{ active: simulator }"
          :title="simulator ? 'Fermer le simulateur' : 'Ouvrir le simulateur'"
          @click="toggleSimulate"
        >
          <font-awesome-icon icon="funnel-dollar" />
        </button>
        <button
          class="details-btn"
          :class="{ active: showDetails }"
          :title="showDetails ? 'Masquer les détails' : 'Afficher les détails'"
        >
          <font-awesome-icon
            :icon="showDetails ? 'chevron-up' : 'chevron-down'"
          />
        </button>
      </div>
    </div>

    <div
      v-if="showDetails"
      class="card-content"
    >
      <div class="amortissement-grid">
        <div class="duration-card">
          <div class="card-info">
            <h4>⏱️ Durée</h4>
            <div class="duration-values">
              <div class="duration-item">
                <span class="duration-number">{{
                  dureeAmortissement.year
                }}</span>
                <span class="duration-unit">années</span>
              </div>
              <div class="duration-separator">
                +
              </div>
              <div class="duration-item">
                <span class="duration-number">{{
                  dureeAmortissement.yearMonth
                }}</span>
                <span class="duration-unit">mois</span>
              </div>
            </div>
            <div class="total-months">
              Total: {{ dureeAmortissement.month }} mois
            </div>
          </div>
        </div>

        <div class="cost-card">
          <div class="card-info">
            <h4>💰 Coût</h4>
            <div class="cost-breakdown">
              <div class="cost-item">
                <div class="cost-period">
                  Par an
                </div>
                <div class="cost-value">
                  {{ formatPrice(prixAmortissement.year) }}€
                </div>
              </div>
              <div class="cost-item">
                <div class="cost-period">
                  Par mois
                </div>
                <div class="cost-value">
                  {{ formatPrice(prixAmortissement.month) }}€
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="simulator"
      class="simulator-section"
    >
      <div class="simulator-header">
        <h4>📊 Simulateur de revente</h4>
      </div>

      <div class="simulator-form">
        <div class="form-group">
          <label for="prix-revente">Prix de revente</label>
          <div class="input-wrapper">
            <input
              id="prix-revente"
              v-model="simulatorData.prixRevente"
              type="number"
              placeholder="0"
              min="0"
              step="0.01"
              class="price-input"
            >
            <span class="input-suffix">€</span>
          </div>
        </div>

        <div class="form-group">
          <label for="date-revente">Date de revente</label>
          <input
            id="date-revente"
            v-model="simulatorData.dateRevente"
            type="date"
            class="date-input"
          >
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { ref, computed } from 'vue'

  const { operation } = defineProps(['operation'])

  const simulator = ref(false)
  const showDetails = ref(false)
  const MILLISECONDS_IN_YEAR = 31536000000

  const simulatorData = ref({
    prixRevente: 0,
    dateRevente: undefined
  })

  const currentDate = computed(() =>
    simulatorData.value.dateRevente
      ? new Date(simulatorData.value.dateRevente)
      : new Date()
  )

  const duree = computed(() => {
    const current = currentDate.value.getTime()
    const operationDate = new Date(operation.DateOp).getTime()
    return current - operationDate
  })

  const montantTotal = computed(() =>
    Math.round(operation.MontantOp * -1 - simulatorData.value.prixRevente)
  )

  const dureeAmortissement = computed(() => ({
    year: Math.floor(duree.value / MILLISECONDS_IN_YEAR),
    yearMonth:
      Math.floor(duree.value / (MILLISECONDS_IN_YEAR / 12)) -
      Math.floor(duree.value / MILLISECONDS_IN_YEAR) * 12,
    month: Math.floor(duree.value / (MILLISECONDS_IN_YEAR / 12))
  }))

  const prixAmortissement = computed(() => ({
    year: Math.round(montantTotal.value / (dureeAmortissement.value.year || 1)),
    month: Math.round(montantTotal.value / (dureeAmortissement.value.month || 1))
  }))

  function formatPrice (value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(Math.abs(value))
  }

  function toggleDetails () {
    showDetails.value = !showDetails.value
  }

  function toggleSimulate (event: MouseEvent) {
    simulator.value = !simulator.value
    if (!simulator.value) {
      simulatorData.value = {
        prixRevente: 0,
        dateRevente: undefined
      }
    }
    event.stopPropagation()
    event.preventDefault()
  }
</script>
<style scoped>
.amortissement-card {
  background: var(--bg-card);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
  box-shadow: var(--shadow-glass);
  border: var(--glass-border);
  backdrop-filter: var(--glass-blur);
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.amortissement-card::before {
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

@keyframes gradient {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.amortissement-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-lg);
}

.card-content {
  margin-top: var(--spacing-2xl);
}

.operation-info {
  flex: 1;
}

.header-price {
  display: flex;
  align-items: center;
}

.price-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-md) var(--spacing-md);
  background: var(--bg-success-light);
  border-radius: var(--radius-lg);
  border: 2px solid rgba(72, 187, 120, 0.2);
}

.price-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.price-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-success-dark);
}

.operation-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm) 0;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.operation-date {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: var(--font-weight-medium);
}

.date-icon {
  font-size: 1rem;
}

.actions {
  display: flex;
  gap: var(--spacing-sm);
}

.details-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-normal);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.details-btn:hover {
  background: var(--bg-muted);
  transform: scale(1.05);
}

.details-btn.active {
  background: var(--success-gradient);
  color: white;
  box-shadow: var(--shadow-btn);
}

.simulator-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-normal);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.simulator-btn:hover {
  background: var(--bg-muted);
  transform: scale(1.05);
}

.simulator-btn.active {
  background: var(--primary-gradient);
  color: white;
  box-shadow: var(--shadow-btn);
}

.amortissement-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: var(--spacing-xl);
}

.duration-card,
.cost-card {
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  padding: var(--spacing-lg);
  border: 2px solid var(--border-color);
  transition: all var(--transition-normal);
}

.duration-card:hover,
.cost-card:hover {
  border-color: var(--text-muted);
  transform: translateY(-2px);
}

.card-info h4 {
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-lg) 0;
}

.duration-values {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.duration-item {
  text-align: center;
}

.duration-number {
  display: block;
  font-size: 2rem;
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.duration-unit {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  font-weight: var(--font-weight-medium);
}

.duration-separator {
  font-size: var(--font-size-2xl);
  color: var(--text-light);
  font-weight: var(--font-weight-semibold);
}

.total-months {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--bg-muted);
  border-radius: var(--radius-md);
}

.cost-breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.cost-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--bg-card);
  border-radius: 10px;
  border: 1px solid var(--border-color);
}

.cost-period {
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
}

.cost-value {
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  font-size: 1.1rem;
}

.simulator-section {
  margin-top: var(--spacing-2xl);
  padding: var(--spacing-xl);
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  border: 2px solid var(--border-color);
}

.simulator-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.simulator-header h4 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm) 0;
}

.simulator-header p {
  color: var(--text-muted);
  margin: 0;
  font-size: 0.9rem;
}

.simulator-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: var(--spacing-xl);
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.input-wrapper {
  position: relative;
}

.price-input,
.date-input {
  width: 100%;
  padding: 0.875rem var(--spacing-lg);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
  transition: all var(--transition-normal);
  background: var(--bg-input);
  color: var(--text-primary);
}

.price-input {
  padding-right: 2.5rem;
}

.input-suffix {
  position: absolute;
  right: var(--spacing-lg);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-weight: var(--font-weight-semibold);
}

.price-input:focus,
.date-input:focus {
  outline: none;
  border-color: var(--border-color-focus);
  box-shadow: var(--input-focus-shadow);
}

@media (max-width: 768px) {
  .amortissement-card {
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
  }

  .card-header {
    gap: var(--spacing-lg);
    align-items: flex-start;
  }

  .duration-values {
    gap: var(--spacing-sm);
  }

  .duration-separator {
    transform: rotate(90deg);
  }
}
</style>
