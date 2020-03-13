<template>
  <div class="compte-list">
    <compte
      v-for="account in availableCompte"
      :key="'account-' + account.IDcompte"
      :account-informations="account"
      fa_icon="check"
    />
    <hr>
    <compte
      v-for="account in bloquedCompte"
      :key="'account-' + account.IDcompte"
      :account-informations="account"
      fa_icon="times-circle"
    />
    <hr>
    <compte
      v-for="account in porteFeuilleCompte"
      :key="'account-' + account.IDcompte"
      :account-informations="account"
      fa_icon="money-bill"
    />
    <hr>
    <compte
      :account-informations="totalAccounts.available"
      :bold-title="cssClasses.compteBoldTitle.boldTitle"
      :disable-click="true"
      no-color="true"
    />
    <compte
      :account-informations="totalAccounts.all"
      :bold-title="cssClasses.compteBoldTitle.boldTitle"
      :disable-click="true"
      :warning="$store.state.user.warningTotal"
    />
  </div>
</template>

<script>
  import Compte from './CompteList/Compte'

  import { mapGetters } from 'vuex'

  export default {
    name: 'CompteList',
    components: { Compte },

    computed: {
      ...mapGetters([
        'totalAvailable',
        'totalGlobal',
        'userID',
        'availableCompte',
        'bloquedCompte',
        'porteFeuilleCompte'
      ])
    },

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
