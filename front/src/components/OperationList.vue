<template>
  <div class="operation-list">
    <component
      :is="OperationRenderer"
      v-for="operation in operationsList"
      :key="'operation-' + operation.IDop"
      v-bind="{ operation }"
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
  import { useStore } from 'vuex'

  defineProps({
    OperationRenderer: { type: Object, required: true }
  })

  const store = useStore()
  const sentinelRef = ref<HTMLElement | null>(null)

  const userFavoris = computed(() => store.state.user.favoris)
  const accountList = computed(() => store.state.compte.accountList)
  const activeAccount = computed(() => store.state.compte.activeAccount)

  const operationsOfActiveAccount = computed(
    () => store.state.operation.operationsOfActiveAccount
  )
  const hasMoreOperations = computed(() => store.state.operation.hasMoreOperations && activeAccount.value.NomCompte !== 'Amortissement')
  const isLoadingOperations = computed(() => store.state.operation.isLoadingOperations)

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
      store.dispatch('loadMoreOperations')
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
      observer.observe(sentinelRef.value)
    }
  })

  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
    }
  })

  watch(() => accountList.value, () => {
    if (!activeAccount.value?.IDcompte) {
      store.dispatch('fetchActiveAccount', userFavoris.value)
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
