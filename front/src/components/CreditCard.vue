<template>
  <div
    class="credit-card"
    @click="editCredit"
  >
    <div class="credit-card-header">
      <h3 class="credit-name">
        {{ credit.NomCredit }}
      </h3>
      <span
        class="credit-status"
        :class="`status-${credit.Statut}`"
      >
        {{ statusLabel }}
      </span>
    </div>

    <div class="credit-card-body">
      <div
        v-if="credit.NomPreteur"
        class="credit-lender"
      >
        <font-awesome-icon
          icon="building"
          class="icon"
        />
        <span>{{ credit.NomPreteur }}</span>
      </div>

      <div class="credit-amount">
        <div class="amount-item">
          <span class="label">Montant initial</span>
          <span class="value">{{ formatAmount(credit.MontantInitial) }}</span>
        </div>
        <div class="amount-item">
          <span class="label">Mensualité</span>
          <span class="value montant-negatif">{{ formatAmount(credit.MontantMensuel) }}</span>
        </div>
      </div>

      <div
        v-if="balance"
        class="credit-progress"
      >
        <div class="progress-info">
          <span class="label">Solde restant</span>
          <span class="value">{{ formatAmount(balance.solde) }}</span>
        </div>
        <div class="progress-bar-container">
          <div
            class="progress-bar"
            :style="{ width: progressPercent + '%' }"
          />
        </div>
        <div class="progress-details">
          <span>{{ progressPercent.toFixed(1) }}% remboursé</span>
          <span>{{ formatAmount(balance.paye) }} payé</span>
        </div>
      </div>

      <div
        v-if="credit.TauxInteret"
        class="credit-rate"
      >
        <font-awesome-icon
          icon="percent"
          class="icon"
        />
        <span>Taux: {{ credit.TauxInteret }}%</span>
      </div>

      <div class="credit-dates">
        <div class="date-item">
          <span class="label">Début</span>
          <span class="value">{{ formatDate(credit.DateDebut) }}</span>
        </div>
        <div class="date-item">
          <span class="label">Fin</span>
          <span class="value">{{ formatDate(credit.DateFin) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { useStore } from 'vuex'

  const props = defineProps({
    credit: {
      type: Object,
      required: true
    }
  })

  const router = useRouter()
  const store = useStore()

  const balance = computed(() => {
    return store.state.credit.creditBalances[props.credit.IDcredit]
  })

  const progressPercent = computed(() => {
    if (!balance.value) return 0
    const percent = (balance.value.paye / props.credit.MontantInitial) * 100
    return Math.min(100, Math.max(0, percent))
  })

  const statusLabel = computed(() => {
    const labels = {
      actif: 'Actif',
      termine: 'Terminé',
      suspendu: 'Suspendu'
    }
    return labels[props.credit.Statut] || props.credit.Statut
  })

  const formatAmount = (amount) => {
    if (amount === undefined || amount === null) return '0,00 €'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
  }

  const editCredit = () => {
    router.push(`/editCredit/${props.credit.IDcredit}`)
  }
</script>

<style scoped>
.credit-card {
  background: var(--bg-card, #ffffff);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color, #e0e0e0);
}

.credit-card:hover {
  box-shadow: var(--shadow-lg, 0 10px 15px rgba(0, 0, 0, 0.1));
  transform: translateY(-2px);
}

.credit-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.credit-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #333);
  margin: 0;
}

.credit-status {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-actif {
  background-color: #e3f2fd;
  color: #1976d2;
}

.status-termine {
  background-color: #e8f5e9;
  color: #388e3c;
}

.status-suspendu {
  background-color: #fff3e0;
  color: #f57c00;
}

.credit-card-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.credit-lender {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary, #666);
  font-size: 0.95rem;
}

.credit-amount {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.amount-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.amount-item .label {
  font-size: 0.875rem;
  color: var(--text-secondary, #666);
}

.amount-item .value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.montant-negatif {
  color: var(--color-danger, #d32f2f);
}

.credit-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-info .label {
  font-size: 0.875rem;
  color: var(--text-secondary, #666);
}

.progress-info .value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.progress-bar-container {
  height: 8px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #81c784);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
  color: var(--text-secondary, #666);
}

.credit-rate {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary, #666);
  font-size: 0.95rem;
}

.credit-dates {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.date-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.date-item .label {
  font-size: 0.875rem;
  color: var(--text-secondary, #666);
}

.date-item .value {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.icon {
  width: 1rem;
  height: 1rem;
}

@media (max-width: 768px) {
  .credit-card {
    padding: 1rem;
  }

  .credit-name {
    font-size: 1.125rem;
  }

  .credit-amount,
  .credit-dates {
    grid-template-columns: 1fr;
  }
}
</style>
