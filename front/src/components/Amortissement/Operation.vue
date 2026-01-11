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
  background: white;
  border-radius: 20px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
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
  background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
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
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.card-content {
  margin-top: 2rem;
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
  gap: 0.25rem;
  padding: 0.75rem 0.75rem;
  background: linear-gradient(135deg, #f0fff4 0%, #e6fffa 100%);
  border-radius: 12px;
  border: 2px solid rgba(72, 187, 120, 0.2);
}

.price-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #4a5568;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.price-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: #38a169;
}

.operation-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.operation-date {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #718096;
  font-size: 0.9rem;
  font-weight: 500;
}

.date-icon {
  font-size: 1rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.details-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 12px;
  background: #f7fafc;
  color: #4a5568;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.details-btn:hover {
  background: #edf2f7;
  transform: scale(1.05);
}

.details-btn.active {
  background: linear-gradient(135deg, #38a169 0%, #48bb78 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(56, 161, 105, 0.4);
}

.simulator-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 12px;
  background: #f7fafc;
  color: #4a5568;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.simulator-btn:hover {
  background: #edf2f7;
  transform: scale(1.05);
}

.simulator-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.amortissement-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 1.5rem;
}

.duration-card,
.cost-card {
  background: #f8fafc;
  border-radius: 16px;
  padding: 1rem;
  border: 2px solid #e2e8f0;
  transition: all 0.3s ease;
}

.duration-card:hover,
.cost-card:hover {
  border-color: #cbd5e0;
  transform: translateY(-2px);
}

.card-info h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 1rem 0;
}

.duration-values {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.duration-item {
  text-align: center;
}

.duration-number {
  display: block;
  font-size: 2rem;
  font-weight: 800;
  color: #667eea;
}

.duration-unit {
  font-size: 0.875rem;
  color: #718096;
  font-weight: 500;
}

.duration-separator {
  font-size: 1.5rem;
  color: #cbd5e0;
  font-weight: 600;
}

.total-months {
  text-align: center;
  font-size: 0.875rem;
  color: #4a5568;
  font-weight: 500;
  padding: 0.5rem 1rem;
  background: #edf2f7;
  border-radius: 8px;
}

.cost-breakdown {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cost-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.cost-period {
  font-weight: 500;
  color: #4a5568;
}

.cost-value {
  font-weight: 700;
  color: #2d3748;
  font-size: 1.1rem;
}

.simulator-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
  border-radius: 16px;
  border: 2px solid #e2e8f0;
}

.simulator-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.simulator-header h4 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 0.5rem 0;
}

.simulator-header p {
  color: #718096;
  margin: 0;
  font-size: 0.9rem;
}

.simulator-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.input-wrapper {
  position: relative;
}

.price-input,
.date-input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
}

.price-input {
  padding-right: 2.5rem;
}

.input-suffix {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #718096;
  font-weight: 600;
}

.price-input:focus,
.date-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

@media (max-width: 768px) {
  .amortissement-card {
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .card-header {
    gap: 1rem;
    align-items: flex-start;
  }

  .duration-values {
    gap: 0.5rem;
  }

  .duration-separator {
    transform: rotate(90deg);
  }
}
</style>
