<template>
  <div class="amortissement-view">
    <OperationList :OperationRenderer="OperationRenderer" />
  </div>
</template>

<script setup lang="ts">
  import { useStore } from 'vuex'
  import OperationList from '@/components/OperationList.vue'
  import OperationRenderer from '@/components/Amortissement/Operation.vue'

  const store = useStore()
  store.commit('setOperationsOfActiveAccount', [])
  store.dispatch('fetchOperations', {
    amortissement: 1
  })
  store.commit('setActiveAccount', { NomCompte: 'Amortissement' })
</script>

<style lang="scss" scoped>
.amortissement-view {
    margin-bottom: $navbar-height-and-margin;

}
</style>
