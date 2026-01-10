<template>
  <div
    v-if="operationRecurrente"
    class="operation-form"
    @keypress.enter="updateOperationRecurrente"
  >
    <div class="form-card">
      <h2 class="form-title">
        {{
          operationRecurrente.IDopRecu
            ? "Modifier l'opération récurrente"
            : "Nouvelle opération récurrente"
        }}
      </h2>

      <div class="form-group">
        <label for="operation-name" class="form-label">Titre</label>
        <input
          id="operation-name"
          v-model="operationRecurrente.NomOpRecu"
          type="text"
          class="form-input"
          placeholder="Entrez le titre de l'opération récurrente"
        />
      </div>

      <div class="form-group">
        <label for="operation-amount" class="form-label">Montant</label>
        <input
          id="operation-amount"
          v-model="operationRecurrente.MontantOpRecu"
          type="number"
          class="form-input"
          :class="montantClass()"
          placeholder="0.00"
          step="0.01"
          @blur="blurMontantOp"
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="operation-frequency" class="form-label">Fréquence</label>
          <select
            id="operation-frequency"
            v-model="operationRecurrente.Frequence"
            class="form-select"
          >
            <option value="3">Mensuelle</option>
            <option value="7">Annuelle</option>
          </select>
        </div>

        <div
          v-if="isYearly"
          class="form-group"
        >
          <label for="operation-month" class="form-label">Mois</label>
          <select
            id="operation-month"
            v-model="operationRecurrente.MoisOpRecu"
            class="form-select"
          >
            <option value="0">Janvier</option>
            <option value="1">Février</option>
            <option value="2">Mars</option>
            <option value="3">Avril</option>
            <option value="4">Mai</option>
            <option value="5">Juin</option>
            <option value="6">Juillet</option>
            <option value="7">Août</option>
            <option value="8">Septembre</option>
            <option value="9">Octobre</option>
            <option value="10">Novembre</option>
            <option value="11">Décembre</option>
          </select>
        </div>

        <div class="form-group">
          <label for="operation-day-num" class="form-label">Jour du mois</label>
          <input
            id="operation-day-num"
            v-model="operationRecurrente.JourNumOpRecu"
            type="number"
            class="form-input"
            placeholder="Jour (1-31)"
            min="1"
            max="31"
          />
        </div>
      </div>

      <div class="form-group">
        <label for="operation-account" class="form-label">Compte</label>
        <select
          id="operation-account"
          v-model="operationRecurrente.IDcompte"
          class="form-select"
        >
          <option value="" disabled>Sélectionnez un compte</option>
          <option
            v-for="account in accountList"
            :key="'account-' + account.IDcompte"
            :value="account.IDcompte"
          >
            {{ account.NomCompte }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="operation-category" class="form-label">Catégorie</label>
        <select
          id="operation-category"
          v-model="operationRecurrente.IDcat"
          class="form-select"
        >
          <option value="" disabled>Sélectionnez une catégorie</option>
          <option
            v-for="category in categoryList"
            :key="'category-' + category.IDcat"
            :value="category.IDcat"
          >
            {{ category.Nom }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Type d'opération</label>
        <div class="toggle-group">
          <button
            type="button"
            :class="[
              'toggle-btn',
              'toggle-btn-credit',
              { active: montantOpIsPositive },
            ]"
            @click="montantIsPositive"
          >
            <span class="toggle-icon">+</span>
            Crédit
          </button>
          <button
            type="button"
            :class="[
              'toggle-btn',
              'toggle-btn-debit',
              { active: !montantOpIsPositive },
            ]"
            @click="montantIsNegative"
          >
            <span class="toggle-icon">-</span>
            Débit
          </button>
        </div>
      </div>

      <div class="form-actions">
        <button
          type="button"
          class="btn btn-primary"
          @click="updateOperationRecurrente"
        >
          <span class="btn-icon">✓</span>
          {{ operationRecurrente.IDopRecu ? "Modifier" : "Créer" }}
        </button>

        <button
          v-if="operationRecurrente.IDopRecu"
          type="button"
          class="btn btn-danger"
          @click="deleteOperationRecurrente"
        >
          <span class="btn-icon">🗑</span>
          Supprimer
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";

const store = useStore();
const route = useRoute();
const router = useRouter();

const operationRecurrenteID = ref(route.params.id);

const montantOpIsPositive = ref(false);
const operationRecurrente = ref({
  IDopRecu: undefined,
  NomOpRecu: "",
  MontantOpRecu: 0,
  JourOpRecu: 1,
  JourNumOpRecu: 1,
  MoisOpRecu: 1,
  Frequence: 3,
  DernierDateOpRecu: new Date(),
  IDcompte: undefined,
  IDcat: 0,
});

const accountList = computed(() =>
  store.state.compte.accountList.filter((account) => account.visible)
);
const categoryList = computed(() => store.state.category.list);
const activeAccountID = computed(
  () => store.state.compte.activeAccount.IDcompte
);
const isYearly = computed(() => operationRecurrente.value.Frequence == 7);

watch(activeAccountID, (value) => {
  if (!operationRecurrente.value.IDopRecu) {
    operationRecurrente.value.IDcompte = value;
  }
});

const blurMontantOp = (event) => {
  operationRecurrente.value.MontantOpRecu = parseFloat(event.target.value);

  if (
    operationRecurrente.value.MontantOpRecu > 0 &&
    !montantOpIsPositive.value
  ) {
    operationRecurrente.value.MontantOpRecu *= -1;
  }
};

const montantClass = () => {
  return montantOpIsPositive.value ? "montant-positif" : "montant-negatif";
};

const montantIsPositive = () => {
  montantOpIsPositive.value = true;
  operationRecurrente.value.MontantOpRecu = Math.abs(
    operationRecurrente.value.MontantOpRecu
  );
};

const montantIsNegative = () => {
  montantOpIsPositive.value = false;
  operationRecurrente.value.MontantOpRecu *= -1;
};

const updateOperationRecurrente = () => {
  store.dispatch("updateRecurringOperation", operationRecurrente.value);

  if (operationRecurrente.value.IDopRecu === undefined) {
    resetOperationAttribut();
  } else {
    router.push("/recurrOperation");
  }
};

const deleteOperationRecurrente = () => {
  store.dispatch("deleteRecurringOperation", operationRecurrente.value);
  router.push("/recurrOperation");
};

const resetOperationAttribut = () => {
  operationRecurrente.value.NomOpRecu = "";
  operationRecurrente.value.MontantOpRecu = 0;
  operationRecurrente.value.JourOpRecu = 1;
  operationRecurrente.value.Frequence = 3;
  montantOpIsPositive.value = false;
};

// Lifecycle hooks
onMounted(() => {
  const nameInput = document.querySelector(
    "#operation-name"
  ) as HTMLInputElement;
  if (nameInput) {
    nameInput.focus();
  }
  if (!operationRecurrente.value.IDopRecu) {
    operationRecurrente.value.IDcompte = activeAccountID.value;
  }
});

// Equivalent to created
if (operationRecurrenteID.value) {
  const existingOperation = store.state.operation.recurringOperations?.find(
    (op) => op.IDopRecu === parseInt(operationRecurrenteID.value as string)
  );
  if (existingOperation) {
    operationRecurrente.value = { ...existingOperation };
    montantOpIsPositive.value = operationRecurrente.value.MontantOpRecu > 0;
  }
} else {
  operationRecurrente.value.DernierDateOpRecu = new Date();
  operationRecurrente.value.IDcompte = activeAccountID.value;
}
</script>

<style scoped>
.operation-form {
  max-width: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  width: 100%;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.form-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 1rem;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.form-label {
  display: block;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: #f8fafc;
  color: #2d3748;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  transform: translateY(-1px);
}

.form-input::placeholder {
  color: #a0aec0;
}

.montant-positif {
  border-color: #48bb78 !important;
  color: #38a169;
  background: #f0fff4;
}

.montant-negatif {
  border-color: #f56565 !important;
  color: #e53e3e;
  background: #fff5f5;
}

.toggle-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  max-width: 300px;
  margin: auto;
  gap: 1rem;
  background: #f7fafc;
  padding: 0.5rem;
  border-radius: 12px;
  border: 2px solid #e2e8f0;
}

.toggle-btn {
  padding: 0.5rem 0.8rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: transparent;
  color: #718096;
}

.toggle-btn-credit {
  background: rgba(72, 187, 120, 0.1);
  color: #38a169;
  border: 2px solid rgba(72, 187, 120, 0.3);
}

.toggle-btn-credit:hover {
  background: rgba(72, 187, 120, 0.2);
  transform: translateY(-1px);
  border-color: #48bb78;
}

.toggle-btn-credit.active {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
  border-color: #48bb78;
}

.toggle-btn-debit {
  background: rgba(245, 101, 101, 0.1);
  color: #e53e3e;
  border: 2px solid rgba(245, 101, 101, 0.3);
}

.toggle-btn-debit:hover {
  background: rgba(245, 101, 101, 0.2);
  transform: translateY(-1px);
  border-color: #f56565;
}

.toggle-btn-debit.active {
  background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(245, 101, 101, 0.4);
  border-color: #f56565;
}

.toggle-icon {
  font-weight: bold;
  font-size: 1.1rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 1rem;
  min-width: 120px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  flex: 1;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.btn-danger {
  background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
  color: white;
}

.btn-danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(245, 101, 101, 0.4);
}

.btn-icon {
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .form-card {
    padding: 1.5rem;
  }
}
</style>
