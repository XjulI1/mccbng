<template>
  <div id="app">
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
  import axios from 'axios'
  import config from '@/config'

  import Navbar from '@/components/Navbar'
  import CompteList from '@/components/CompteList'
  import AccountHeader from '@/components/AccountHeader'
  import TimeSeriesEvolutionSoldes from './components/Stats/TimeSeriesEvolutionSoldes'
  import NewVersion from './components/NewVersion'

  export default {
    name: 'App',

    components: { NewVersion, TimeSeriesEvolutionSoldes, CompteList, AccountHeader, Navbar },

    beforeCreate () {
      const userToken = this.$cookies.get('userToken')
      const userID = this.$cookies.get('userID')

      if (userToken === null) {
        this.$router.push('/login')
      } else {
        axios.get(config.API_URL + '/api/users/' + userID + '/exists', {
          params: {
            access_token: userToken
          }
        }).then(() => {
          this.$store.dispatch('saveUserToken', userToken)
          this.$store.dispatch('fetchUserByIDAndActiveAccount', userID)
        }).catch((err) => {
          if (err.response.status === 401) {
            this.$router.push('/login')
          }
        })
      }
    },

    created () {
      this.$store.dispatch('initialState')
    }
  }
</script>

<style lang="scss">
  #app {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #2c3e50;
    margin-top: $header-height;
  }

  .row {
    margin: 0 !important;
    padding: 0 !important
  }

  .container {
    margin: 0 !important;
    padding: 0 !important
  }

  .left-panel {
    margin-top: 5px;
    width: 35%;
  }

  .right-panel {
    margin-top: 5px;
    width: 65%;
  }

  .container-flex {
    display: flex;
  }

  @media screen and (max-width: 767px) {
    .left-panel {
      margin-top: 0;
      background-color: rgba(242, 242, 242, 0.95);
      width: 100%;
      padding-top: 3px;
      margin-bottom: $navbar-height;
    }

    .right-panel {
      width: 100%;
    }

    .right-panel.mask-panel {
      display: none;
    }

    .left-panel.mask-panel {
      display: none;
    }
  }
</style>
