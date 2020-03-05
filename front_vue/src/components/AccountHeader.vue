<template>
  <div class="app-header">
    <div class="container">
      <div class="row">
        <div class="col-2">
          <search-button/>
        </div>
        <div class="col-8 account-info">
          <div>
            {{nomCompte}}
          </div>
          <div :class="{'no-total' : disabledTotal}">
            {{($store.state.activeAccount.soldeNotChecked || 0).toLocaleString()}} {{$store.state.currency}} -
            [{{($store.state.activeAccount.soldeChecked || 0).toLocaleString()}}
            {{$store.state.currency}}]
          </div>
        </div>
        <div class="col-2">
          <charts-button/>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { mapState } from 'vuex'

  import SearchButton from './AccountHeader/SearchButton'
  import ChartsButton from './AccountHeader/ChartsButton'

  import 'mccbng_styles/components/Header.scss'

  export default {
    name: 'AccountHeader',
    components: { ChartsButton, SearchButton },

    computed: {
      ...mapState({ activeAccount: 'activeAccount' }),
      disabledTotal () {
        return this.$route.meta.disabledTotalHeader === undefined ? false : this.$route.meta.disabledTotalHeader
      }
    },

    watch: {
      activeAccount (value) {
        this.nomCompte = value.NomCompte
      }
    },

    data () {
      return {
        nomCompte: ''
      }
    }
  }
</script>

<style lang="scss" scoped>
  .container {
    margin-left: auto !important;
    margin-right: auto !important;
  }

  .col-2 {
    padding: 0
  }
</style>
