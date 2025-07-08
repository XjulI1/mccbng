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
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  width: 100%;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.form-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 1.5rem;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.form-input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: #f8fafc;
  color: #2d3748;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  transform: translateY(-1px);
}

.form-input::placeholder {
  color: #a0aec0;
}

@media (max-width: 768px) {
  .form-card {
    padding: 1.5rem;
  }
}
</style>
