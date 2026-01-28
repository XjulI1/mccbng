<template>
  <div class="search-form">
    <div class="form-card">
      <h2 class="form-title">
        Rechercher une opération
      </h2>

      <div class="form-group">
        <input
          id="search-input"
          ref="searchInputRef"
          v-model="searchTerms"
          type="text"
          class="form-input"
          placeholder="Entrez vos termes de recherche..."
          @keyup="search"
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useStore } from 'vuex'

  const store = useStore()

  const searchTerms = ref('')
  const timer = ref<number | null>(null)
  const searchInputRef = ref<HTMLInputElement | null>(null)

  onMounted(() => {
    if (searchInputRef.value) {
      searchInputRef.value.focus()
    }
  })

  const search = () => {
    if (timer.value) {
      clearTimeout(timer.value)
      timer.value = null
    }
    timer.value = window.setTimeout(() => {
      store.dispatch('getSearchOperations', searchTerms.value)
    }, 200)
  }
</script>

<style scoped>
.search-form {
  max-width: 600px;
  margin: -1rem;
  padding: var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-card {
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  padding: var(--spacing-2xl);
  box-shadow: var(--shadow-xl);
  width: 100%;
  backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
}

.form-title {
  font-size: 1.8rem;
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-xl);
  text-align: center;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.form-input {
  width: 100%;
  padding: 0.875rem var(--spacing-lg);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
  transition: all var(--transition-normal);
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.form-input:focus {
  outline: none;
  border-color: var(--border-color-focus);
  background: var(--bg-input);
  box-shadow: var(--input-focus-shadow);
  transform: translateY(-1px);
}

.form-input::placeholder {
  color: var(--text-light);
}

@media (max-width: 768px) {
  .form-card {
    padding: var(--spacing-xl);
  }
}
</style>
