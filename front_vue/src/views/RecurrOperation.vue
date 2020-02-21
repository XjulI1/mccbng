<template>
  <operation-list/>
</template>

<script>
  import OperationList from '@/components/OperationList'

  export default {
    name: 'RecurrOperation',

    components: { OperationList },

    created () {
      this.$store.dispatch('fetchRecurrOperation')
    }
  }
</script>

<style scoped>

</style>
