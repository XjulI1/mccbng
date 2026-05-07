<template>
  <div class="readonly-operation">
    <div class="readonly-operation__main">
      <span
        class="readonly-operation__name"
        :class="{ 'readonly-operation__name--no-category': !hasCategory }"
      >
        {{ operation.NomOp }}
      </span>
      <span
        class="readonly-operation__amount"
        :class="amountClass"
      >
        <Currency :amount="operation.MontantOp" />
      </span>
    </div>
    <div class="readonly-operation__meta">
      <span>{{ formattedDate }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import Currency from '../Currency.vue'

  const props = defineProps<{
    operation: {
      IDop: number
      NomOp: string
      MontantOp: number
      DateOp: string
      IDcat: number
    }
  }>()

  const hasCategory = computed(() => props.operation.IDcat !== 0)
  const amountClass = computed(() =>
    props.operation.MontantOp < 0
      ? 'readonly-operation__amount--negative'
      : 'readonly-operation__amount--positive'
  )

  const formattedDate = computed(() =>
    new Date(props.operation.DateOp).toLocaleDateString('fr-FR')
  )
</script>

<style scoped>
  .readonly-operation {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-md) var(--spacing-sm);
    border-bottom: 1px solid var(--border-color);
  }
  .readonly-operation:last-child {
    border-bottom: none;
  }
  .readonly-operation__main {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--spacing-md);
  }
  .readonly-operation__name {
    font-weight: var(--font-weight-medium);
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1 1 auto;
    min-width: 0;
  }
  .readonly-operation__name--no-category {
    color: var(--text-muted);
    font-style: italic;
  }
  .readonly-operation__amount {
    flex: 0 0 auto;
    font-weight: var(--font-weight-bold);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .readonly-operation__amount--positive {
    color: var(--color-success, #2e7d32);
  }
  .readonly-operation__amount--negative {
    color: var(--color-danger, #c62828);
  }
  .readonly-operation__meta {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }
</style>
