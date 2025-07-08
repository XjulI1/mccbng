<template>
  <div>
    <input
      id="search-input"
      ref="searchInputRef"
      v-model="searchTerms"
      type="text"
      class="form-control"
      placeholder="Search terms"
      @keyup="search"
    >
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { useStore } from 'vuex'

  const store = useStore()

  const searchTerms = ref('')
  const timer = ref(null)
  const searchInputRef = ref(null)

  onMounted(() => {
    searchInputRef.value.focus()
  })

  const search = () => {
    if (timer.value) {
      clearTimeout(timer.value)
      timer.value = null
    }
    timer.value = setTimeout(() => {
      store.dispatch('getSearchOperations', searchTerms.value)
    }, 200)
  }
</script>
