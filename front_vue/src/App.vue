<template>
  <div
          id="app"
          class="root-app"
  >
    <account-header/>
    <div class="container-flex">
      <div
              class="left-panel"
              :class="{'mask-panel' : !$store.state.display.account_list}"
      >
        <CompteList/>
        <TimeSeriesEvolutionSoldes/>
      </div>
      <router-view
              class="right-panel"
              :class="{'mask-panel' : $store.state.display.account_list}"
      />
    </div>
    <Navbar/>
    <NewVersion/>
  </div>
</template>

<script>
  import Navbar from '@/components/Navbar'
  import CompteList from '@/components/CompteList'
  import AccountHeader from '@/components/AccountHeader'
  import TimeSeriesEvolutionSoldes from './components/Stats/TimeSeriesEvolutionSoldes'
  import NewVersion from './components/NewVersion'

  import 'mccbng_styles/index.scss'
  import 'mccbng_styles/App.scss'
  import 'mccbng_styles/components/LeftPanel.scss'
  import { mapGetters } from 'vuex'

  export default {
    name: 'App',

    components: { NewVersion, TimeSeriesEvolutionSoldes, CompteList, AccountHeader, Navbar },

    computed: {
      ...mapGetters([
        'userID'
      ])
    },

    watch: {
      userID () {
        this.$store.dispatch('fetchAccountList')
      }
    },

    beforeCreate () {
      this.$router.push('/login')
    }
  }
</script>

<style lang="scss">
  .left-panel {
    display: block;
  }

  .row {
    margin: 0 !important;
    padding: 0 !important
  }

  .container {
    margin: 0 !important;
    padding: 0 !important
  }

  @media screen and (max-width: 767px) {
    .right-panel.mask-panel {
      display: none;
    }

    .left-panel.mask-panel {
      display: none;
    }
  }
</style>
