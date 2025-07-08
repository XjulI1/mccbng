<template>
  <div
    class="transfert-form"
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
      id="operation-montant"
      v-model="operation.MontantOp"
      type="number"
      class="form-control"
      placeholder="Montant"
      @blur="blurMontantOp"
    >
    <input
      v-model="operation.DateOp"
      type="date"
      class="form-control"
      placeholder="Date"
    >

    <div class="debit-credit">
      <select
        v-model="operation.IDcompteDebit"
        class="form-control select-compte-debit"
      >
        <option
          v-for="account in accountsDebit"
          :key="'account-' + account.IDcompte"
          :value="account.IDcompte"
        >
          {{ account.NomCompte }}
        </option>
      </select>
      <div>➡️</div>
      <select
        v-model="operation.IDcompteCredit"
        class="form-control select-compte-credit"
      >
        <option
          v-for="account in accountsCredit"
          :key="'account-' + account.IDcompte"
          :value="account.IDcompte"
        >
          {{ account.NomCompte }}
        </option>
      </select>
    </div>
    <div>
      <button
        class="btn btn-primary"
        @click="updateOperation"
      >
        Valider
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted, getCurrentInstance } from 'vue'
  import { useStore } from 'vuex'
  import { useRoute } from 'vue-router'

  const props = defineProps({
    cash: {
      type: Boolean,
      default: false
    }
  })

  const store = useStore()
  const route = useRoute()
  const { proxy } = getCurrentInstance()

  const operation = ref({
    NomOp: route.name,
    MontantOp: 0,
    DateOp: new Date(),
    IDcompteDebit: undefined,
    IDcompteCredit: undefined,
    IDcat: props.cash ? 21 : 25
  })

  const activeAccountID = computed(
    () => store.state.compte.activeAccount.IDcompte
  )
  const visibleAccounts = computed(() => store.getters.visibleAccounts)
  const porteFeuilleCompte = computed(() => store.getters.porteFeuilleCompte)
  const getAccount = computed(() => store.getters.getAccount)

  const accountsDebit = computed(() => {
    return visibleAccounts.value.filter((account) => {
      const IDcompte = parseFloat(account.IDcompte)
      if (
        IDcompte !== parseFloat(operation.value.IDcompteCredit) &&
        IDcompte !== parseFloat(porteFeuilleCompte.value[0].IDcompte)
      ) {
        return account
      }
      return undefined
    })
  })

  const accountsCredit = computed(() => {
    if (props.cash) {
      operation.value.IDcompteCredit = porteFeuilleCompte.value[0].IDcompte
      return porteFeuilleCompte.value
    }

    return visibleAccounts.value.filter((account) => {
      const IDcompte = parseFloat(account.IDcompte)

      if (
        parseFloat(account.IDcompte) !==
        parseFloat(operation.value.IDcompteDebit) &&
        IDcompte !== parseFloat(porteFeuilleCompte.value[0].IDcompte)
      ) {
        return account
      }
      return undefined
    })
  })

  watch(activeAccountID, (value) => {
    operation.value.IDcompteDebit = value
  })

  watch(
    () => props.cash,
    (value) => {
      operation.value.IDcat = value ? 21 : 25
    }
  )

  watch(
    () => route.name,
    (value) => {
      operation.value.NomOp = value
    }
  )

  const blurMontantOp = (event) => {
    operation.value.MontantOp = parseFloat(event.target.value)
  }

  const updateOperation = () => {
    const NomOp =
      operation.value.NomOp +
      ' (' +
      getAccount.value(operation.value.IDcompteDebit).NomCompte +
      ' -> ' +
      getAccount.value(operation.value.IDcompteCredit).NomCompte +
      ')'
    store.dispatch('createTransfert', {
      ...operation.value,
      NomOp,
      DateOp: new Date(operation.value.DateOp)
    })

    resetOperationAttribut()
  }

  const resetOperationAttribut = () => {
    operation.value.MontantOp = 0
    operation.value.IDcompteCredit = undefined
  }

  // Lifecycle hooks
  onMounted(() => {
    proxy.$el.querySelector('#operation-montant').focus()
    operation.value.IDcompteDebit = activeAccountID.value
  })

  // Equivalent to created
  operation.value.DateOp = new Date(operation.value.DateOp)
    .toISOString()
    .split('T')[0]
</script>

<style lang="scss" scoped>
input {
  width: 100%;
  margin-top: 15px;
  margin-bottom: 15px;
}

.transfert-form {
  text-align: center;

  .debit-credit {
    margin-bottom: 1.5rem;

    div {
      width: 10%;
      display: inline-block;
    }

    select {
      display: inline-block;
      width: 45%;
    }
  }
}
</style>
