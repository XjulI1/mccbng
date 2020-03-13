<template>
  <div class="config">
    <a
      class="btn btn-info"
      href="/"
    >
      <font-awesome-icon icon="redo" />
      Reload App
    </a>
  </div>
</template>

<script>
  import 'mccbng_styles/routes/Config.scss'

  export default {
    name: 'Config',

    created () {
      this.$store.commit('setActiveAccount', { NomCompte: 'Configurations' })
    }
  }
</script>
