<template>
  <div class="compte-list">
    <compte
      v-for="account in availableCompte"
      :key="'account-' + account.IDcompte"
      :account-informations="account"
      fa-icon="check"
    />
    <hr>
    <compte
      v-for="account in bloquedCompte"
      :key="'account-' + account.IDcompte"
      :account-informations="account"
      fa-icon="times-circle"
    />
    <hr>
    <compte
      v-for="account in porteFeuilleCompte"
      :key="'account-' + account.IDcompte"
      :account-informations="account"
      fa-icon="money-bill"
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
  import Compte from './Compte'

  import { mapGetters } from 'vuex'

  export default {
    name: 'CompteList',
    components: { Compte },

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
    },

    computed: {
      ...mapGetters([
        'totalAvailable',
        'totalGlobal',
        'availableCompte',
        'bloquedCompte',
        'porteFeuilleCompte'
      ])
    },

    watch: {
      totalAvailable (value) {
        this.totalAccounts.available = {
          NomCompte: 'Total disponible',
          soldeNotChecked: value
        }
      },

      totalGlobal (value) {
        this.totalAccounts.all = {
          NomCompte: 'Total global',
          soldeNotChecked: value
        }
      }
    }
  }
</script>
