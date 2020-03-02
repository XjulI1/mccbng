<template>
  <button class="btn btn-primary new-operation-button" v-on:click="addOperation" v-bind="{disabled}">
    <font-awesome-icon icon="plus"/>
  </button>
</template>

<script>
  export default {
    name: 'NewOperationButton',

    computed: {
      disabled () {
        return this.$route.meta.disabledTotalHeader === undefined ? false : this.$route.meta.disabledTotalHeader
      }
    },

    methods: {
      addOperation () {
        this.$router.push('/newOperation')
      }
    }
  }
</script>

<style lang="scss" scoped>
  button {
    width: 24%;
    height: $navbar-height;
    font-size: 1.3rem;
    line-height: 1.1rem;
    font-weight: 600;
  }
</style>
