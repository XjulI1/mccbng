<template>
  <div class="config">
    <a
      class="btn btn-info"
      href="/"
    >
      <font-awesome-icon icon="redo" />
      Reload App
    </a>
    <br>
    <br>
    <button
      class="btn btn-warning"
      @click="toggleAmount"
    >
      <font-awesome-icon icon="money-bill" />
      Masquer les montants
    </button>
    <br>
    <br>
    <button
      class="btn btn-success"
      @click="toggleZoomStats"
    >
      <font-awesome-icon icon="chart-area" />
      Zoom évolution solde
    </button>
    <div class="api-url">
      {{ apiURL }}
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import { useStore } from 'vuex'

  const store = useStore()

  const apiURL = import.meta.env.VITE_API_URL

  onMounted(() => {
    store.commit('setActiveAccount', { NomCompte: 'Configurations' })
  })

  const toggleAmount = (event) => {
    store.dispatch('toggleMaskAmount')
    event.target.blur()
  }

  const toggleZoomStats = (event) => {
    store.dispatch('toggleZoomStats')
    event.target.blur()
  }
</script>
<style lang="scss" scoped>
.config {
  text-align: center;
  margin-top: 20px;

  svg {
    margin-right: 5px;
  }
}

.api-url {
  margin-top: 20px;
}
</style>
