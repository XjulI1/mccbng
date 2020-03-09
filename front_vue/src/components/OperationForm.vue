<template>
  <div class="operation-form" v-if="operation" @keypress.enter="updateOperation">
    <input id="operation-name" type="text" class="form-control" placeholder="Titre" v-model="operation.NomOp"/>
    <input type="number" class="form-control" :class="montantClass()" placeholder="Montant"
           v-model="operation.MontantOp" @blur="blurMontantOp"/>
    <input type="date" class="form-control" placeholder="Date" v-model="operation.DateOp"/>

    <select class="form-control select-category" v-model="operation.IDcat">
      <option v-for="category in $store.state.category.list" v-bind:key="'category-' + category.IDcat"
              :value="category.IDcat">
        {{category.Nom}}
      </option>
    </select>
    <div>
      <input id="OpCheck" type="checkbox" class="op-checkbox" v-model="operation.CheckOp"/>
      <label class="" for="OpCheck">Check</label>
    </div>
    <div class="btn-group debit-credit" role="group">
      <button class="btn btn-success" @click="montantIsPositive">Crédit</button>
      <button class="btn btn-danger" @click="montantIsNegative">Débit</button>
    </div>
    <div>
      <button class="btn btn-primary" @click="updateOperation">Valider</button>
    </div>
    <div class="btn-delete" v-if="operation.IDop">
      <button class="btn btn-sm btn-warning" @click="deleteOperation">Delete</button>
    </div>
  </div>
</template>

<script>
  import { mapState } from 'vuex'

  export default {
    name: 'OperationForm',

    props: {
      operation: {
        type: Object,
        default: () => {
          return {
            NomOp: '',
            MontantOp: 0,
            DateOp: new Date(),
            CheckOp: false,
            IDcompte: undefined,
            IDcat: 0
          }
        }
      }
    },

    data () {
      return {
        montantOpIsPositive: false
      }
    },

    computed: mapState({
      activeAccountID: state => state.activeAccount.IDcompte
    }),

    watch: {
      activeAccountID (value) {
        this.operation.IDcompte = value
      }
    },

    mounted () {
      this.$el.querySelector('#operation-name').focus()
      this.operation.IDcompte = this.activeAccountID
    },

    created () {
      this.operation.DateOp = new Date(this.operation.DateOp).toISOString().split('T')[0]
      this.montantOpIsPositive = this.operation.MontantOp > 0
      this.$store.dispatch('fetchCategoryList')
    },

    methods: {
      blurMontantOp (event) {
        this.operation.MontantOp = parseFloat(event.target.value)

        if (this.operation.MontantOp > 0 && !this.montantOpIsPositive) {
          this.operation.MontantOp *= -1
        }
      },

      montantClass () {
        return this.montantOpIsPositive ? 'montant-positif' : 'montant-negatif'
      },

      montantIsPositive () {
        this.montantOpIsPositive = true
        this.operation.MontantOp = Math.abs(this.operation.MontantOp)
      },

      montantIsNegative () {
        this.montantOpIsPositive = false
        this.operation.MontantOp *= -1
      },

      updateOperation () {
        this.$store.dispatch('updateOperation', Object.assign({}, this.operation))

        if (this.operation.IDop === undefined) {
          this.resetOperationAttribut()
        } else {
          this.$router.push('/')
        }
      },

      deleteOperation () {
        this.$store.dispatch('deleteOperation', this.operation)

        this.$router.push('/')
      },

      resetOperationAttribut () {
        this.operation.NomOp = ''
        this.operation.MontantOp = 0
        this.operation.CheckOp = false

        this.montantOpIsPositive = false
      }
    }
  }
</script>

<style scoped>
  input {
    width: 100%;
    margin-top: 15px;
    margin-bottom: 15px;
  }

  .operation-form {
    text-align: center
  }

  .select-category {
    width: 60%
  }

  .op-checkbox {
    width: 1.5rem
  }

  .debit-credit {
    margin-bottom: 1.5rem;
  }

  .montant-positif {
    color: green
  }

  .montant-negatif {
    color: red
  }

  .btn-delete {
    text-align: right;
  }
</style>
