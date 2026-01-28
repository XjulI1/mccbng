<template>
  <div class="credit-list">
    <div
      v-if="isLoadingCredits && creditsList.length === 0"
      class="loading-indicator"
    >
      <font-awesome-icon
        icon="spinner"
        spin
        class="loading-icon"
      />
      <span>Chargement des crédits...</span>
    </div>

    <div
      v-else-if="creditsList.length === 0"
      class="empty-state"
    >
      <font-awesome-icon
        icon="credit-card"
        class="empty-icon"
      />
      <p class="empty-message">
        Aucun crédit enregistré
      </p>
      <p class="empty-sub">
        Ajoutez votre premier crédit en cliquant sur le bouton +
      </p>
    </div>

    <div
      v-else
      class="credits-container"
    >
      <CreditCard
        v-for="credit in creditsList"
        :key="credit.IDcredit"
        :credit="credit"
      />
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useStore } from 'vuex'
  import CreditCard from './CreditCard.vue'

  const store = useStore()

  const creditsList = computed(() => store.state.credit.creditList || [])
  const isLoadingCredits = computed(() => store.state.credit.isLoadingCredits)
</script>

<style scoped>
.credit-list {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: var(--text-secondary, #666);
  gap: 1rem;
}

.loading-icon {
  font-size: 2rem;
  color: var(--primary-color, #1976d2);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  color: var(--text-light, #ccc);
  margin-bottom: 1rem;
}

.empty-message {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #333);
  margin: 0 0 0.5rem 0;
}

.empty-sub {
  font-size: 1rem;
  color: var(--text-secondary, #666);
  margin: 0;
}

.credits-container {
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .credit-list {
    padding: 0.5rem;
  }
}
</style>
