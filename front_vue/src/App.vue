<template>
  <div
    id="app"
    class="root-app"
  >
    <account-header />
    <div class="container-flex">
      <div
        class="left-panel"
        :class="{'mask-panel' : !displayAccountList}"
      >
        <CompteList v-touch:swipe.left="closeAccountList" />
        <TimeSeriesEvolutionSoldes />
      </div>
      <router-view
        v-touch:swipe.right="openAccountList"
        class="right-panel"
        :class="{'mask-panel' : displayAccountList}"
      />
    </div>
    <NavBar />
    <NewVersion />
  </div>
</template>

<script>
  import { mapState } from 'vuex'

  import NavBar from '@/components/NavBar'
  import CompteList from '@/components/CompteList'
  import AccountHeader from '@/components/AccountHeader'
  import TimeSeriesEvolutionSoldes from './components/Stats/TimeSeriesEvolutionSoldes'
  import NewVersion from './components/NewVersion'

  import 'mccbng_styles/index.scss'
  import 'mccbng_styles/App.scss'
  import 'mccbng_styles/components/LeftPanel.scss'
  import 'mccbng_styles/bootstrap.css'

  export default {
    name: 'App',

    components: { NewVersion, TimeSeriesEvolutionSoldes, CompteList, AccountHeader, NavBar },

    computed: mapState({
      userID: state => state.user.id,
      displayAccountList: state => state.display.account_list
    }),

    watch: {
      userID () {
        this.$store.dispatch('fetchAccountList')
      }
    },

    beforeCreate () {
      this.$router.push('/login')
    },

    methods: {
      openAccountList () {
        this.$store.dispatch('toggleAccountList', true)
      },

      closeAccountList () {
        this.$store.dispatch('toggleAccountList', false)
      }
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

  @media screen and (max-width: $mobile_BP_max_width) {
    .left-panel {
      z-index: 2;
      position: absolute;
      left: 0;
      transition: 0.3s;
    }

    .left-panel.mask-panel {
      left: -100%;
    }

    .right-panel.mask-panel {
      height: 100vh;
      overflow-y: hidden;
    }
  }
</style>
