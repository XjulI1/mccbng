<template>
  <div class="operations-container">
    <!-- Barre de contrôles -->
    <div class="controls-bar">
      <div class="control-group">
        <h3>Grouper par</h3>
        <button
          @click="setGrouping('account')"
          :class="['control-button', { active: grouping === 'account' }]"
        >
          Compte
        </button>
        <button
          @click="setGrouping('category')"
          :class="['control-button', { active: grouping === 'category' }]"
        >
          Catégorie
        </button>
      </div>

      <div class="control-group">
        <h3>Tri par 📅</h3>
        <button
          @click="setSorting('asc')"
          :class="['control-button', { active: sorting === 'asc' }]"
        >
          Ascendant
        </button>
        <button
          @click="setSorting('desc')"
          :class="['control-button', { active: sorting === 'desc' }]"
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
          <h4 class="group-title">{{ groupName }}</h4>
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
import { computed, ref } from "vue";
import { useStore } from "vuex";
import OperationRecurrente from "./OperationRecurrente.vue";

const props = defineProps({
  operations: {
    type: Array,
    default: () => [],
  },
});

const store = useStore();

// État pour les contrôles
const grouping = ref("none"); // 'none', 'account', 'category'
const sorting = ref("desc"); // 'asc', 'desc'

// Fonctions pour changer les contrôles
const setGrouping = (type: string) => {
  if (type === grouping.value) {
    // Si le type est déjà sélectionné, on le remet à "none"
    grouping.value = "none";
    return;
  }
  grouping.value = type;
};

const setSorting = (type: string) => {
  sorting.value = type;
};

// Tri des opérations
const sortedOperations = computed(() => {
  const sorted = [...props.operations].sort((a: any, b: any) => {
    const dateA = new Date(a.DernierDateOpRecu);
    const dateB = new Date(b.DernierDateOpRecu);

    if (sorting.value === "asc") {
      return dateA.getTime() - dateB.getTime();
    } else {
      return dateB.getTime() - dateA.getTime();
    }
  });

  return sorted;
});

// Regroupement des opérations
const groupedOperations = computed(() => {
  const groups: { [key: string]: any[] } = {};

  sortedOperations.value.forEach((operation: any) => {
    let groupKey = "";

    if (grouping.value === "account") {
      const account = store.state.compte.accountList.find(
        (acc: any) => acc.IDcompte === operation.IDcompte
      );
      groupKey = account?.NomCompte || "Compte inconnu";
    } else if (grouping.value === "category") {
      const category = store.state.category.list.find(
        (cat: any) => cat.IDcat === operation.IDcat
      );
      groupKey = category?.Nom || "Catégorie inconnue";
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(operation);
  });

  return groups;
});
</script>

<style scoped>
.operations-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.controls-bar {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  /* flex-direction: column; */
  gap: 8px;
}

.control-group h3 {
  margin: 0 0 8px 0;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
}

.control-button {
  background: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  color: #374151;
  font-weight: 500;
  min-width: 120px;
  text-align: center;
  max-height: fit-content;
}

.control-button:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.control-button.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.control-button.active:hover {
  background: #2563eb;
}

.operations-list {
  margin-top: 20px;
}

.operation-group {
  margin-bottom: 32px;
}

.group-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
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
