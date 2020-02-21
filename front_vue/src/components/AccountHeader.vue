<template>
  <div class="account-header">
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
  @import '@/global.scss';

  .no-total {
    display: none
  }

  .account-header {
    height: $header-account-height;
    width: 100%;
    background-color: rgba(200, 200, 200, 0.9);
    position: fixed;
    top: 0;
    left: 0;
    text-align: center;
    padding-top: 10px;
    z-index: 100;

    .container {
      margin-left: auto !important;
      margin-right: auto !important;
    }

    .col-2 {
      padding: 0
    }

    .account-info {
      font-weight: bold;
      font-size: 1.1rem;
      padding: 0;
    }
  }
</style>
