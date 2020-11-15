<template>
  <div class="container">
    <div class="row">
      <div class="col-9">
        <label>
          {{ operation.NomOpRecu }}
          <br>
          {{ dateOperation }}
        </label>
      </div>
      <div
        class="col-3 center-text"
        :class="css.montant"
      >
        {{ operation.MontantOpRecu.toLocaleString() }}{{ currency }}
      </div>
    </div>
  </div>
</template>

<script>
  import { mapState } from 'vuex'

  export default {
    name: 'OperationRecurrente',

    props: {
      operation: {
        type: Object,
        default: () => {
        }
      }
    },

    data () {
      return {
        dateOperation: new Date(this.operation.DernierDateOpRecu).toLocaleDateString(),
        css: {
          montant: this.operation.MontantOpRecu > 0 ? 'montantIn' : 'montantOut'
        }
      }
    },

    computed: mapState({
      currency: state => state.compte.currency
    })
  }
</script>

<style scoped>
  .center-text {
    text-align: center;
  }

  .montantIn {
    color: green;
  }

  .montantOut {
    color: red
  }
</style>
