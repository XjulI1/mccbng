<template>
  <button class="btn btn-success disabled new-operation-button" v-on:click="doTransfert">
    <font-awesome-icon icon="exchange-alt"/>
  </button>
</template>

<script>
  export default {
    name: 'VirementButton',

    methods: {
      doTransfert () {
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
