<template>
  <div class="operation container">
    <div class="row">
      <div class="col-9" :class="css.category">
        <label>
          {{operation.NomOpRecu}}
          <br>
          {{dateOperation}}
        </label>
      </div>
      <div class="col-3 center-text" :class="css.montant">
        {{operation.MontantOpRecu.toLocaleString()}}{{$store.state.currency}}
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'OperationRecurrente',
    props: ['operation'],

    data () {
      return {
        dateOperation: new Date(this.operation.DernierDateOpRecu).toLocaleDateString(),
        css: {
          category: this.operation.IDcat === 0 ? 'noCategory' : '',
          montant: this.operation.MontantOpRecu > 0 ? 'montantIn' : 'montantOut'
        }
      }
    },

    created () {
    },

    methods: {}
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

  .noCategory {
    color: grey;
  }
</style>
