<template>
  <div class="op-recurrentes">
    <NuxtPage />
    <operation-recurrente-list :operations="operationsRecurrenteList" />
  </div>
</template>

<script setup lang="ts">
  import { definePageMeta } from '#imports'
  import { NuxtPage } from '#components'
  import { computed, watch, onMounted } from 'vue'
  import { useCompteStore } from '@/stores/compte'
  import { useOperationStore } from '@/stores/operation'
  import { useUserStore } from '@/stores/user'
  import OperationRecurrenteList from '@/components/OperationRecurrenteList.vue'

  const compteStore = useCompteStore()
  const operationStore = useOperationStore()
  const userStore = useUserStore()

  operationStore.setOperationsOfActiveAccount([])
  compteStore.setActiveAccount({ NomCompte: 'Opérations récurrentes' })

  const userToken = computed(() => userStore.token)
  const operationsOfActiveAccount = computed(
    () => operationStore.operationsOfActiveAccount
  )

  const operationsRecurrenteList = computed(() => {
    const firstOperation = operationsOfActiveAccount.value?.[0]
    if (firstOperation && firstOperation.IDopRecu !== undefined) {
      return operationsOfActiveAccount.value
    }
    return []
  })

  watch(userToken, () => {
    operationStore.fetchRecurrOperation()
  })

  onMounted(() => {
    if (userToken.value) {
      operationStore.fetchRecurrOperation()
    }
  })

  definePageMeta({
    name: 'Opérations récurrentes',
    disabledTotalHeader: true
  })
</script>
<style lang="scss" scoped>
.op-recurrentes {
  margin-bottom: $navbar-height-and-margin;
}
</style>
