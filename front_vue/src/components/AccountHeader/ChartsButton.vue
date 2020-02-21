<template>
  <button class="btn btn-secondary new-operation-button" v-on:click="goToStats">
    <font-awesome-icon icon="chart-pie"/>
  </button>
</template>

<script>
  export default {
    name: 'ChartsButton',

    methods: {
      goToStats () {
        this.$router.push('stats')
      }
    }
  }
</script>

<style scoped>
  button {
    width: 50px;
    height: 50px;
    font-size: 1.2rem;
    line-height: 1.1rem;
  }
</style>
