<template>
  <div class="account-informations container" :class="classPointer" @click="getAccountDetails">
    <div class="row">
      <div class="col-8" :class="classBoldTitle">
        <font-awesome-icon :icon="fa_icon" class="icon-fa" v-if="fa_icon"/>
        {{accountInformations.NomCompte}}
      </div>
      <div class="col-4 account-solde" :class="soldeColor">
        {{accountInformations.solde.toLocaleString()}} {{$store.state.currency}}
      </div>
    </div>
    <div class="row" v-if="warning">
      <div class="col-12 warning-infos" :class="soldeColor">
        {{(accountInformations.solde - warning).toLocaleString()}} {{$store.state.currency}}
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'Compte',
    props: ['accountInformations', 'boldTitle', 'disableClick', 'noColor', 'warning', 'fa_icon'],

    watch: {
      'accountInformations.solde' () {
        this.soldeColor = this.getSoldeColor()
      }
    },

    data () {
      return {
        soldeColor: this.getSoldeColor(),
        classBoldTitle: this.boldTitle ? 'bold-title' : '',
        classPointer: this.disableClick ? '' : 'cursor-pointer'
      }
    },

    methods: {
      getAccountDetails () {
        if (!this.disableClick) {
          if (this.$route.path !== '/') {
            this.$router.push('/')
          }

          this.$store.dispatch('fetchActiveAccount', this.accountInformations.IDcompte)
          this.$store.dispatch('toggleAccountList', false)
        }
      },

      getSoldeColor () {
        if (this.noColor) {
          return ''
        }

        if (this.accountInformations.solde < this.warning) {
          return 'soldeWarning'
        }

        return this.accountInformations.solde >= 0 ? 'soldeIn' : 'soldeOut'
      }
    }
  }
</script>

<style scoped>
  .account-informations {
    padding-top: 5px !important;
    padding-bottom: 5px !important;
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .bold-title {
    font-weight: bold;
  }

  .soldeIn {
    color: green;
  }

  .soldeWarning {
    color: orange;
  }

  .soldeOut {
    color: red;
    font-weight: bold;
  }

  .warning-infos {
    text-align: right;
    font-size: 0.7rem;
    font-weight: bold;
  }

  .account-solde {
    text-align: right
  }

  .col-8 {
    padding-left: 10px;
  }

  .col-4, .col-12 {
    padding: 0 10px 0 0;
  }

  .icon-fa {
    font-size: 0.7rem;
    color: grey;
    margin-bottom: 0.1rem;
  }
</style>
