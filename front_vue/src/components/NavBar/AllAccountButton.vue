<template>
  <button class="btn btn-warning new-operation-button" v-on:click="openAllAccount">
    <font-awesome-icon icon="list"/>
  </button>
</template>

<script>
  export default {
    name: 'AllAccountButton',

    methods: {
      openAllAccount () {
        this.$store.dispatch('toggleAccountList')
      }
    }
  }
</script>

<style lang="scss" scoped>
  button {
    width: 19%;
    height: $navbar-height;
    font-size: 1.2rem;
    line-height: 1.1rem;
    font-weight: 600;
  }
</style>
