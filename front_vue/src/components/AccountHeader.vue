<template>
  <div class="app-header">
    <div>
      <button class="btn btn-info search-button" v-on:click="searchOperation">
        <font-awesome-icon icon="search"/>
      </button>
    </div>
    <div class="account-info">
      <div>
        {{activeAccount.NomCompte}}
      </div>
      <div :class="{'no-total' : disabledTotal}">
        {{(activeAccount.soldeNotChecked || 0).toLocaleString()}} {{currency}} -
        [{{(activeAccount.soldeChecked || 0).toLocaleString()}}
        {{currency}}]
      </div>
    </div>
    <div>
      <button class="btn btn-secondary chart-button" v-on:click="goToStats">
        <font-awesome-icon icon="chart-pie"/>
      </button>
    </div>
  </div>
</template>

<script>
  import { mapState } from 'vuex'

  import 'mccbng_styles/components/Header.scss'

  export default {
    name: 'AccountHeader',

    computed: {
      ...mapState({ activeAccount: 'activeAccount', currency: 'currency' }),
      disabledTotal () {
        return this.$route.meta.disabledTotalHeader === undefined ? false : this.$route.meta.disabledTotalHeader
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
  .app-header {
    display: flex;
    justify-content: space-between;

    padding-left: 10px;
    padding-right: 10px;

    @media all and (min-width: $desktop_BP_min_width) {
      padding-left: 15%;
      padding-right: 15%;
    }

    button.chart-button,
    button.search-button {
      width: 50px;
      height: 50px;
      font-size: 1.2rem;
      line-height: 1.1rem;
    }
  }
</style>
