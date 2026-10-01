<template>
  <div class="amortissement-view">
    <OperationList :OperationRenderer="OperationRenderer" />
  </div>
</template>

<script setup lang="ts">
  import { definePageMeta } from '#imports'
  import { useCompteStore } from '@/stores/compte'
  import { useOperationStore } from '@/stores/operation'
  import OperationList from '@/components/OperationList.vue'
  import OperationRenderer from '@/components/Amortissement/Operation.vue'

  const compteStore = useCompteStore()
  const operationStore = useOperationStore()
  operationStore.setOperationsOfActiveAccount([])
  operationStore.fetchOperations({
    amortissement: 1
  })
  compteStore.setActiveAccount({ NomCompte: "Coûts d'usage" })

  definePageMeta({
    name: 'Amortissement',
    disabledTotalHeader: true
  })
</script>

<style lang="scss" scoped>
.amortissement-view {
    margin-bottom: $navbar-height-and-margin;

}
</style>
