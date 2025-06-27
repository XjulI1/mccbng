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

<script>
  import '@/styles/routes/Config.scss'

  export default {
    name: 'Config',
    data () {
      return {
        apiURL: process.env.VUE_APP_API_URL
      }
    },
    created () {
      this.$store.commit('setActiveAccount', { NomCompte: 'Configurations' })
    },

    methods: {
      toggleAmount (event) {
        this.$store.dispatch('toggleMaskAmount')
        event.target.blur()
      },
      toggleZoomStats (event) {
        this.$store.dispatch('toggleZoomStats')
        event.target.blur()
      }
    }
  }
</script>
<style scoped>
.api-url {
  margin-top: 20px;
}
</style>
