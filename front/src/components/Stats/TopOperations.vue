<template>
  <div>
    <table
      v-if="items && items.length"
      class="top-operations__table"
    >
      <thead>
        <tr>
          <th>Date</th>
          <th>Nom</th>
          <th>Catégorie</th>
          <th class="amount">
            Montant
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="op in items"
          :key="op.IDop"
          class="row"
          @click="goToEdit(op.IDop)"
        >
          <td>{{ formatDate(op.DateOp) }}</td>
          <td class="name">
            {{ op.NomOp }}
          </td>
          <td>{{ categoryName(op.IDcat) }}</td>
          <td class="amount">
            <Currency :amount="op.MontantOp" />
          </td>
        </tr>
      </tbody>
    </table>
    <p
      v-else
      class="empty"
    >
      Aucune opération sur la période sélectionnée.
    </p>
  </div>
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
    return cat?.Nom ?? '-'
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
  .top-operations__table {
    width: 100%;
    border-collapse: collapse;
    color: var(--text-primary);
  }
  .top-operations__table th,
  .top-operations__table td {
    padding: var(--spacing-sm);
    border-bottom: 1px solid var(--border-color);
    text-align: left;
  }
  .top-operations__table th.amount,
  .top-operations__table td.amount {
    text-align: right;
  }
  .row {
    cursor: pointer;
    transition: background var(--transition-normal);
  }
  .row:hover {
    background: var(--bg-muted);
  }
  .name {
    font-weight: var(--font-weight-medium);
  }
  .empty {
    color: var(--text-secondary);
    text-align: center;
    margin: var(--spacing-md) 0;
  }
</style>
