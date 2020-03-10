<template>
  <div class="compte-list">
    <compte :account-informations="account" v-for="account in $store.getters.availableCompte"
            v-bind:key="'account-' + account.IDcompte" fa_icon="check"/>
    <hr>
    <compte :account-informations="account" v-for="account in $store.getters.bloquedCompte"
            v-bind:key="'account-' + account.IDcompte" fa_icon="times-circle"/>
    <hr>
    <compte :account-informations="account" v-for="account in $store.getters.porteFeuilleCompte"
            v-bind:key="'account-' + account.IDcompte" fa_icon="money-bill"/>
    <hr>
    <compte :account-informations="totalAccounts.available" :boldTitle="cssClasses.compteBoldTitle.boldTitle"
            :disable-click="true" no-color="true"/>
    <compte :account-informations="totalAccounts.all" :boldTitle="cssClasses.compteBoldTitle.boldTitle"
            :disable-click="true" :warning="$store.state.user.warningTotal"/>
  </div>
</template>

<script>
  import Compte from './CompteList/Compte'

  import { mapGetters } from 'vuex'

  export default {
    name: 'CompteList',
    components: { Compte },

    computed: { ...mapGetters(['totalAvailable', 'totalGlobal', 'userID']) },

    watch: {
      totalAvailable (value) {
        this.totalAccounts.available = {
          NomCompte: 'Total disponible',
          solde: value
        }
      },

      totalGlobal (value) {
        this.totalAccounts.all = {
          NomCompte: 'Total global',
          solde: value
        }
      },

      userID () {
        this.$store.dispatch('fetchAccountList')
      }
    },

    data () {
      return {
        totalAccounts: {
          available: {
            NomCompte: 'Total disponible',
            solde: 0
          },
          all: {
            NomCompte: 'Total global',
            solde: 0
          }
        },
        cssClasses: {
          compteBoldTitle: { boldTitle: true }
        }
      }
    }
  }
</script>
