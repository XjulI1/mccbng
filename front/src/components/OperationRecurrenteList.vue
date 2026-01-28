<template>
  <div class="operations-container">
    <!-- Barre de contrôles -->
    <div class="controls-bar">
      <div class="control-group">
        <h3>Grouper par</h3>
        <button
          :class="['control-button', { active: grouping === 'account' }]"
          @click="setGrouping('account')"
        >
          Compte
        </button>
        <button
          :class="['control-button', { active: grouping === 'category' }]"
          @click="setGrouping('category')"
        >
          Catégorie
        </button>
      </div>

      <div class="control-group">
        <h3>Tri par 📅</h3>
        <button
          :class="['control-button', { active: sorting === 'asc' }]"
          @click="setSorting('asc')"
        >
          Ascendant
        </button>
        <button
          :class="['control-button', { active: sorting === 'desc' }]"
          @click="setSorting('desc')"
        >
          Descendant
        </button>
      </div>
    </div>

    <!-- Liste des opérations -->
    <div class="operations-list">
      <div v-if="grouping === 'none'">
        <OperationRecurrente
          v-for="operation in sortedOperations"
          :key="(operation as any).IDopRecu"
          :operation="operation"
        />
      </div>

      <div v-else>
        <div
          v-for="(group, groupName) in groupedOperations"
          :key="groupName"
          class="operation-group"
        >
          <h4 class="group-title">
            {{ groupName }}
          </h4>
          <OperationRecurrente
            v-for="operation in group"
            :key="(operation as any).IDopRecu"
            :operation="operation"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, type ComputedRef, ref } from 'vue'
  import { useStore } from 'vuex'
  import OperationRecurrente from './OperationRecurrente.vue'

  const props = defineProps({
    operations: {
      type: Array,
      default: () => []
    }
  })

  const store = useStore()

  // État pour les contrôles
  const grouping = ref('none') // 'none', 'account', 'category'
  const sorting = ref('desc') // 'asc', 'desc'

  // Fonctions pour changer les contrôles
  const setGrouping = (type: string) => {
    if (type === grouping.value) {
      // Si le type est déjà sélectionné, on le remet à "none"
      grouping.value = 'none'
      return
    }
    grouping.value = type
  }

  const setSorting = (type: string) => {
    sorting.value = type
  }

  // Tri des opérations
  const sortedOperations: ComputedRef<any[]> = computed(() => {
    const sorted = [...props.operations].sort((a: any, b: any) => {
      const dateA = new Date(a.DernierDateOpRecu)
      const dateB = new Date(b.DernierDateOpRecu)

      if (sorting.value === 'asc') {
        return dateA.getTime() - dateB.getTime()
      } else {
        return dateB.getTime() - dateA.getTime()
      }
    })

    return sorted
  })

  // Regroupement des opérations
  const groupedOperations = computed(() => {
    const groups: { [key: string]: any[] } = {}

    sortedOperations.value.forEach((operation: any) => {
      let groupKey = ''

      if (grouping.value === 'account') {
        const account = store.state.compte.accountList.find(
          (acc: any) => acc.IDcompte === operation.IDcompte
        )
        groupKey = account?.NomCompte || 'Compte inconnu'
      } else if (grouping.value === 'category') {
        const category = store.state.category.list.find(
          (cat: any) => cat.IDcat === operation.IDcat
        )
        groupKey = category?.Nom || 'Catégorie inconnue'
      }

      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(operation)
    })

    return groups
  })
</script>

<style scoped>
.operations-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 10px;
}

.controls-bar {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  /* flex-direction: column; */
  gap: var(--spacing-sm);
}

.control-group h3 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.control-button {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-lg);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: var(--font-weight-medium);
  min-width: 120px;
  text-align: center;
  max-height: fit-content;
}

.control-button:hover {
  background: var(--bg-muted);
  border-color: var(--text-muted);
}

.control-button.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.control-button.active:hover {
  background: var(--color-primary-dark);
}

.operations-list {
  margin-top: var(--spacing-xl);
}

.operation-group {
  margin-bottom: 32px;
}

.group-title {
  font-size: 1.2rem;
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--spacing-lg) 0;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border-left: 4px solid var(--color-primary);
}

@media (max-width: 768px) {
  .controls-bar {
    flex-direction: column;
    gap: 16px;
  }

  .control-group {
    flex-direction: row;
    align-items: center;
    gap: 12px;
  }

  .control-group h3 {
    margin: 0;
    min-width: 100px;
  }

  .control-button {
    min-width: 100px;
  }
}
</style>
