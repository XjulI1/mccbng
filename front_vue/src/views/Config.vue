<template>
  <div>
    <a href="/">Reload App</a>
  </div>
</template>

<script>
  export default {
    name: 'Config',
    data () {
      return {}
    },

    created () {
      this.$store.commit('setActiveAccount', { NomCompte: 'Configurations' })
    },

    methods: {}
  }
</script>

<style scoped>
  a {
    margin-left: 10px;
    font-size: 1.2rem;
  }
</style>
