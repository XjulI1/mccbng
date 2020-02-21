<template>
  <button class="btn btn-info new-operation-button" v-on:click="searchOperation">
    <font-awesome-icon icon="search"/>
  </button>
</template>

<script>
  export default {
    name: 'SearchButton',

    methods: {
      searchOperation () {
        this.$router.push('search')
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
