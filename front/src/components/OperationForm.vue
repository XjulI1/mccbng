<template>
  <div
    v-if="operation"
    class="operation-form"
    @keypress.enter="updateOperation"
  >
    <input
      id="operation-name"
      v-model="operation.NomOp"
      type="text"
      class="form-control"
      placeholder="Titre"
    >
    <input
      v-model="operation.MontantOp"
      type="number"
      class="form-control"
      :class="montantClass()"
      placeholder="Montant"
      @blur="blurMontantOp"
    >
    <input
      v-model="operation.DateOp"
      type="date"
      class="form-control"
      placeholder="Date"
    >

    <select
      v-model="operation.IDcat"
      class="form-control select-category"
    >
      <option
        v-for="category in categoryList"
        :key="'category-' + category.IDcat"
        :value="category.IDcat"
      >
        {{ category.Nom }}
      </option>
    </select>
    <div>
      <p>
        <input
          id="OpCheck"
          v-model="operation.CheckOp"
          type="checkbox"
          class="op-checkbox"
        >
        <label
          class=""
          for="OpCheck"
        >Check</label>

        <input
          id="Amortissement"
          v-model="operation.amortissement"
          type="checkbox"
          class="op-checkbox"
        >
        <label
          class=""
          for="Amortissement"
        >Amortissement</label>
      </p>
    </div>
    <div
      class="btn-group debit-credit"
      role="group"
    >
      <button
        class="btn btn-success"
        @click="montantIsPositive"
      >
        Crédit
      </button>
      <button
        class="btn btn-danger"
        @click="montantIsNegative"
      >
        Débit
      </button>
    </div>
    <div>
      <button
        class="btn btn-primary"
        @click="updateOperation"
      >
        Valider
      </button>
    </div>
    <div
      v-if="operation.IDop"
      class="btn-delete"
    >
      <button
        class="btn btn-sm btn-warning"
        @click="deleteOperation"
      >
        Delete
      </button>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch, onMounted, getCurrentInstance } from 'vue'
  import { useStore } from 'vuex'
  import { useRouter } from 'vue-router'

  const props = defineProps({
    operationID: {
      type: String,
      default: undefined
    }
  })

  const store = useStore()
  const router = useRouter()
  const { proxy } = getCurrentInstance()

  const montantOpIsPositive = ref(false)
  const operation = ref({
    NomOp: '',
    MontantOp: 0,
    DateOp: new Date(),
    CheckOp: false,
    IDcompte: undefined,
    IDcat: 0
  })

  const activeAccountID = computed(
    () => store.state.compte.activeAccount.IDcompte
  )
  const categoryList = computed(() => store.state.category.list)

  watch(activeAccountID, (value) => {
    operation.value.IDcompte = value
  })

  const blurMontantOp = (event) => {
    operation.value.MontantOp = parseFloat(event.target.value)

    if (operation.value.MontantOp > 0 && !montantOpIsPositive.value) {
      operation.value.MontantOp *= -1
    }
  }

  const montantClass = () => {
    return montantOpIsPositive.value ? 'montant-positif' : 'montant-negatif'
  }

  const montantIsPositive = () => {
    montantOpIsPositive.value = true
    operation.value.MontantOp = Math.abs(operation.value.MontantOp)
  }

  const montantIsNegative = () => {
    montantOpIsPositive.value = false
    operation.value.MontantOp *= -1
  }

  const updateOperation = () => {
    store.dispatch('updateOperation', {
      ...operation.value,
      DateOp: new Date(operation.value.DateOp)
    })

    if (operation.value.IDop === undefined) {
      resetOperationAttribut()
    } else {
      router.push('/')
    }
  }

  const deleteOperation = () => {
    store.dispatch('deleteOperation', operation.value)
    router.push('/')
  }

  const resetOperationAttribut = () => {
    operation.value.NomOp = ''
    operation.value.MontantOp = 0
    operation.value.CheckOp = false
    montantOpIsPositive.value = false
  }

  // Lifecycle hooks
  onMounted(() => {
    proxy.$el.querySelector('#operation-name').focus()
    operation.value.IDcompte = activeAccountID.value
  })

  // Equivalent to created
  operation.value = props.operationID
    ? store.getters.operationFromCurrentList(props.operationID)
    : operation.value
  operation.value.DateOp = new Date(operation.value.DateOp)
    .toISOString()
    .split('T')[0]
  montantOpIsPositive.value = operation.value.MontantOp > 0
</script>

<style scoped>
input {
  width: 100%;
  margin-top: 15px;
  margin-bottom: 15px;
}

.operation-form {
  text-align: center;
}

.select-category {
  width: 60%;
}

.op-checkbox {
  width: 1.5rem;
}

.debit-credit {
  margin-bottom: 1.5rem;
}

.montant-positif {
  color: green;
}

.montant-negatif {
  color: red;
}

.btn-delete {
  text-align: right;
}
</style>
