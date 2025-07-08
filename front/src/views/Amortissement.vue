<template>
  <OperationList :OperationRenderer="OperationRenderer" />
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
