<template>
  <button class="btn btn-info disabled new-operation-button" v-on:click="getMoney">
    <font-awesome-icon icon="money-bill-alt"/>
  </button>
</template>

<script>
  export default {
    name: 'RetraitButton',

    methods: {
      getMoney () {
      }
    }
  }
</script>

<style lang="scss" scoped>
  @import '@/global.scss';

  button {
    width: 19%;
    height: $navbar-height;
    font-size: 1.2rem;
    line-height: 1.1rem;
    font-weight: 600;
  }
</style>
