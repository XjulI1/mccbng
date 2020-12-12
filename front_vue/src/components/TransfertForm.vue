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
      <div>
        ➡️
      </div>
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

<script>
  import { mapState, mapGetters } from 'vuex'

  export default {
    name: 'OperationForm',

    props: {
      cash: {
        type: Boolean,
        default: false
      }
    },

    data () {
      return {
        operation: {
          NomOp: this.$route.name,
          MontantOp: 0,
          DateOp: new Date(),
          IDcompteDebit: undefined,
          IDcompteCredit: undefined,
          IDcat: this.cash ? 21 : 25
        }
      }
    },

    computed: {
      ...mapState({
        activeAccountID: state => state.compte.activeAccount.IDcompte
      }),
      ...mapGetters(['visibleAccounts', 'porteFeuilleCompte', 'getAccount']),
      accountsDebit () {
        return this.visibleAccounts.filter((account) => {
          const IDcompte = parseFloat(account.IDcompte)
          if (IDcompte !== parseFloat(this.operation.IDcompteCredit) && IDcompte !== parseFloat(this.porteFeuilleCompte[0].IDcompte)) {
            return account
          }
        })
      },
      accountsCredit () {
        if(this.cash) {
          this.operation.IDcompteCredit = this.porteFeuilleCompte[0].IDcompte
          return this.porteFeuilleCompte
        }

        return this.visibleAccounts.filter((account) => {
          const IDcompte = parseFloat(account.IDcompte)

          if (parseFloat(account.IDcompte) !== parseFloat(this.operation.IDcompteDebit) && IDcompte !== parseFloat(this.porteFeuilleCompte[0].IDcompte)) {
            return account
          }
        })
      }
    },

    watch: {
      activeAccountID (value) {
        this.operation.IDcompteDebit = value
      }
    },

    created () {
      this.operation.DateOp = new Date(this.operation.DateOp).toISOString().split('T')[0]
    },

    mounted () {
      this.$el.querySelector('#operation-montant').focus()
      this.operation.IDcompteDebit = this.activeAccountID
    },

    methods: {
      blurMontantOp (event) {
        this.operation.MontantOp = parseFloat(event.target.value)
      },

      updateOperation () {
        const NomOp = this.operation.NomOp + ' (' + this.getAccount(this.operation.IDcompteDebit).NomCompte + ' -> ' + this.getAccount(this.operation.IDcompteCredit).NomCompte + ')'
        this.$store.dispatch('createTransfert', { ...this.operation, NomOp })

        this.resetOperationAttribut()
      },

      resetOperationAttribut () {
        this.operation.MontantOp = 0
        this.operation.IDcompteCredit = undefined
      }
    }
  }
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
