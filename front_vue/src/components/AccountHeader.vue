<template>
  <div class="app-header">
    <div class="container">
      <div class="row">
        <div class="col-2">
          <button class="btn btn-info search-button" v-on:click="searchOperation">
            <font-awesome-icon icon="search"/>
          </button>
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
          <button class="btn btn-secondary chart-button" v-on:click="goToStats">
            <font-awesome-icon icon="chart-pie"/>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { mapState } from 'vuex'

  import 'mccbng_styles/components/Header.scss'

  export default {
    name: 'AccountHeader',

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
    },

    methods: {
      goToStats () {
        this.$router.push('stats')
      },

      searchOperation () {
        this.$router.push('search')
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

  button.chart-button,
  button.search-button {
    width: 50px;
    height: 50px;
    font-size: 1.2rem;
    line-height: 1.1rem;
  }
</style>
