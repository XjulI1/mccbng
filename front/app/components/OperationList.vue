<template>
  <div class="operation-list">
    <component
      :is="OperationRenderer"
      v-for="operation in operationsList"
      :key="'operation-' + operation.IDop"
      v-bind="{ operation, readOnly }"
    />
    <div
      v-if="isLoadingOperations"
      class="loading-indicator"
    >
      Chargement...
    </div>
    <div
      v-else-if="!hasMoreOperations && operationsList.length > 0"
      class="end-of-list"
    >
      Fin de la liste
    </div>
    <div
      ref="sentinelRef"
      class="scroll-sentinel"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed, watch, ref, onMounted, onUnmounted } from 'vue'
  import { useCompteStore } from '@/stores/compte'
  import { useOperationStore } from '@/stores/operation'
  import { useUserStore } from '@/stores/user'

  defineProps({
    OperationRenderer: { type: Object, required: true },
    readOnly: { type: Boolean, default: false }
  })

  const compteStore = useCompteStore()
  const operationStore = useOperationStore()
  const userStore = useUserStore()
  const sentinelRef = ref<HTMLElement | null>(null)

  const userFavoris = computed(() => userStore.favoris)
  const accountList = computed(() => compteStore.accountList)
  const activeAccount = computed(() => compteStore.activeAccount)

  const operationsOfActiveAccount = computed(
    () => operationStore.operationsOfActiveAccount
  )
  const hasMoreOperations = computed(() => operationStore.hasMoreOperations && activeAccount.value.NomCompte !== "Coûts d'usage")
  const isLoadingOperations = computed(() => operationStore.isLoadingOperations)
  const isSearchMode = computed(() => operationStore.isSearchMode)

  const operationsList = computed(() => {
    if (
      operationsOfActiveAccount.value &&
      operationsOfActiveAccount.value[0] &&
      operationsOfActiveAccount.value[0].IDop !== undefined
    ) {
      return operationsOfActiveAccount.value
    }
    return []
  })

  let observer: IntersectionObserver | null = null

  const loadMore = () => {
    if (!isLoadingOperations.value && hasMoreOperations.value) {
      if (isSearchMode.value) {
        operationStore.loadMoreSearchOperations()
      } else {
        operationStore.loadMoreOperations()
      }
    }
  }

  onMounted(() => {
    if (sentinelRef.value) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              loadMore()
            }
          })
        },
        {
          root: null,
          rootMargin: '200px',
          threshold: 0
        }
      )
      observer.observe(sentinelRef.value as unknown as Element)
    }
  })

  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
    }
  })

  watch(() => accountList.value, () => {
    if (!activeAccount.value?.IDcompte) {
      compteStore.fetchActiveAccount(userFavoris.value)
    }
  })
</script>
<style lang="scss" scoped>
.operation-list {
  width: 100%;
  padding: 10px;
}

.scroll-sentinel {
  height: 1px;
  width: 100%;
}

.loading-indicator {
  text-align: center;
  padding: 20px;
  color: #6b7280;
  font-size: 0.95rem;
  font-weight: 500;
}

.end-of-list {
  text-align: center;
  padding: 20px;
  color: #9ca3af;
  font-size: 0.9rem;
  font-style: italic;
}
</style>
