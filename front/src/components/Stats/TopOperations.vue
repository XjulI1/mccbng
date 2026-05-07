<template>
  <ul
    v-if="items && items.length"
    class="top-operations__list"
  >
    <li
      v-for="op in items"
      :key="op.IDop"
      class="row"
      @click="goToEdit(op.IDop)"
    >
      <div class="row__main">
        <span class="row__name">{{ op.NomOp }}</span>
        <span
          class="row__amount"
          :class="{ 'row__amount--negative': op.MontantOp < 0 }"
        >
          <Currency :amount="op.MontantOp" />
        </span>
      </div>
      <div class="row__meta">
        <span class="row__category">{{ categoryName(op.IDcat) }}</span>
        <span class="row__separator">·</span>
        <span class="row__date">{{ formatDate(op.DateOp) }}</span>
      </div>
    </li>
  </ul>
  <p
    v-else
    class="empty"
  >
    Aucune opération sur la période sélectionnée.
  </p>
</template>

<script setup lang="ts">
  import { useStore } from 'vuex'
  import { useRouter } from 'vue-router'
  import Currency from '../Currency.vue'

  type OperationItem = {
    IDop: number
    NomOp: string
    MontantOp: number
    DateOp: string
    IDcat: number
  }

  defineProps<{
    items: OperationItem[]
  }>()

  const store = useStore()
  const router = useRouter()

  const categoryName = (IDcat: number) => {
    const cat = store.getters.getCategoryName?.(IDcat)
    return cat?.Nom ?? 'Sans catégorie'
  }

  const formatDate = (date: string) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('fr-FR')
  }

  const goToEdit = (id: number) => {
    router.push(`/editOperation/${id}`)
  }
</script>

<style scoped>
  .top-operations__list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .row {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-md) var(--spacing-sm);
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    transition: background var(--transition-normal);
  }
  .row:last-child {
    border-bottom: none;
  }
  .row:hover {
    background: var(--bg-muted);
  }
  .row__main {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--spacing-md);
  }
  .row__name {
    font-weight: var(--font-weight-medium);
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1 1 auto;
    min-width: 0;
  }
  .row__amount {
    flex: 0 0 auto;
    font-weight: var(--font-weight-bold);
    color: var(--color-success, #2e7d32);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .row__amount--negative {
    color: var(--color-danger, #c62828);
  }
  .row__meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }
  .row__category {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .row__separator {
    opacity: 0.6;
  }
  .row__date {
    flex: 0 0 auto;
  }
  .empty {
    color: var(--text-secondary);
    text-align: center;
    margin: var(--spacing-md) 0;
  }
</style>
