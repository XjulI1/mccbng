<template>
  <div
    v-if="items && items.length"
    class="top-operations__list"
  >
    <Operation
      v-for="op in items"
      :key="op.IDop"
      :operation="op"
      :read-only="true"
    />
  </div>
  <p
    v-else
    class="empty"
  >
    Aucune opération sur la période sélectionnée.
  </p>
</template>

<script setup lang="ts">
  import Operation from '../Home/Operation.vue'

  type OperationItem = {
    IDop: number
    NomOp: string
    MontantOp: number
    DateOp: string
    IDcat: number
    IDcompte: number
  }

  defineProps<{
    items: OperationItem[]
  }>()
</script>

<style scoped>
  .empty {
    color: var(--text-secondary);
    text-align: center;
    margin: var(--spacing-md) 0;
  }
</style>
