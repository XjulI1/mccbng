<template>
  <div id="app" class="root-app">
    <account-header/>
    <div class="container-flex">
      <div class="left-panel" :class="{'mask-panel' : !$store.state.display.account_list}">
        <compte-list/>
        <TimeSeriesEvolutionSoldes/>
      </div>
      <router-view class="right-panel" :class="{'mask-panel' : $store.state.display.account_list}"></router-view>
    </div>
    <navbar/>
    <new-version/>
  </div>
</template>

<script>
  import Navbar from '@/components/Navbar'
  import CompteList from '@/components/CompteList'
  import AccountHeader from '@/components/AccountHeader'
  import TimeSeriesEvolutionSoldes from './components/Stats/TimeSeriesEvolutionSoldes'
  import NewVersion from './components/NewVersion'
  import { checkUserAuthentification, getTokenCookie, getUserIDCookie } from 'mccbng_services/auth'

  import 'mccbng_styles/index.scss'
  import 'mccbng_styles/App.scss'
  import 'mccbng_styles/components/LeftPanel.scss'

  export default {
    name: 'App',

    components: { NewVersion, TimeSeriesEvolutionSoldes, CompteList, AccountHeader, Navbar },

    beforeMount () {
      const userToken = getTokenCookie()
      const userID = getUserIDCookie()

      if (userToken === null) {
        this.$router.push('/login')
      } else {
        return checkUserAuthentification({ userToken, userID, api_url: process.env.VUE_APP_API_URL })
          .then((isExist) => {
            if (isExist) {
              this.$store.dispatch('saveUserToken', userToken)
              this.$store.dispatch('fetchUserByIDAndActiveAccount', userID)
            } else {
              this.$router.push('/login')
            }
          })
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

  @media screen and (max-width: 767px) {
    .right-panel.mask-panel {
      display: none;
    }

    .left-panel.mask-panel {
      display: none;
    }
  }
</style>
