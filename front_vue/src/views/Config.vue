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
  </div>
</template>

<script>
  import 'mccbng_styles/routes/Config.scss'

  export default {
    name: 'Config',

    created () {
      this.$store.commit('setActiveAccount', { NomCompte: 'Configurations' })
    },

    methods: {
      toggleAmount (event) {
        this.$store.dispatch('toggleMaskAmount')
        event.target.blur()
      }
    }
  }
</script>
