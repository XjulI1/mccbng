<template>
  <div class="bien-list">
    <div
      v-if="isLoadingBiens && biensList.length === 0"
      class="loading-indicator"
    >
      <font-awesome-icon
        icon="spinner"
        spin
        class="loading-icon"
      />
      <span>Chargement des biens...</span>
    </div>

    <div
      v-else-if="biensList.length === 0"
      class="empty-state"
    >
      <font-awesome-icon
        icon="home"
        class="empty-icon"
      />
      <p class="empty-message">
        Aucun bien enregistré
      </p>
      <p class="empty-sub">
        Ajoutez votre premier bien immobilier en cliquant sur le bouton +
      </p>
    </div>

    <div
      v-else
      class="biens-container"
    >
      <BienCard
        v-for="bien in biensList"
        :key="bien.IDbien"
        :bien="bien"
      />
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useStore } from 'vuex'
  import BienCard from './BienCard.vue'

  const store = useStore()

  const biensList = computed(() => store.state.bien.bienList || [])
  const isLoadingBiens = computed(() => store.state.bien.isLoadingBiens)
</script>

<style scoped>
.bien-list {
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

.biens-container {
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .bien-list {
    padding: 0.5rem;
  }
}
</style>
