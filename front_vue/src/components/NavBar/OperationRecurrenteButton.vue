<template>
  <button class="btn btn-info operation-recurrente-button" v-on:click="getRecurrenteOp">
    <font-awesome-icon icon="retweet"/>
  </button>
</template>

<script>
  export default {
    name: 'OperationRecurrenteButton',

    methods: {
      getRecurrenteOp () {
        this.$router.push('/recurrOperation')
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
