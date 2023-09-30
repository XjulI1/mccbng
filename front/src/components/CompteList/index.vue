<template>
  <div class="compte-list">
    <compte
      v-for="account in availableCompte"
      :key="'account-' + account.IDcompte"
      :account-informations="account"
      fa-icon="check"
    />
    <compte
      v-for="account in porteFeuilleCompte"
      :key="'account-' + account.IDcompte"
      :account-informations="account"
      fa-icon="money-bill"
    />
    <hr class="hr-point">
    <compte
      :account-informations="totalAccounts.available"
      :bold-title="cssClasses.compteBoldTitle.boldTitle"
      :disable-click="true"
      no-color="true"
    />
    <hr>
    <compte
      v-for="account in bloquedCompte"
      :key="'account-' + account.IDcompte"
      :account-informations="account"
      fa-icon="times-circle"
    />
    <hr class="hr-point">
    <compte
      :account-informations="totalAccounts.all"
      :bold-title="cssClasses.compteBoldTitle.boldTitle"
      :disable-click="true"
      :warning="warningTotal"
    />
    <hr>
    <compte
      v-for="account in retraiteCompte"
      :key="'account-' + account.IDcompte"
      :account-informations="account"
      fa-icon="times-circle"
    />
    <hr class="hr-point">
    <compte
      :account-informations="totalAccounts.retraite"
      :bold-title="cssClasses.compteBoldTitle.boldTitle"
      :disable-click="true"
      no-color="true"
    />
  </div>
</template>

<script>
  import Compte from './Compte'

  import { mapGetters, mapState } from 'vuex'

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
          },
          retraite: {
            NomCompte: 'Total retraite',
            solde: 0
          }
        },
        cssClasses: {
          compteBoldTitle: { boldTitle: true }
        }
      }
    },

    computed: {
      ...mapState({
        warningTotal: (state) => state.user.warningTotal
      }),
      ...mapGetters([
        'totalAvailable',
        'totalGlobal',
        'totalRetraite',
        'availableCompte',
        'bloquedCompte',
        'retraiteCompte',
        'porteFeuilleCompte'
      ])
    },

    watch: {
      totalAvailable (value) {
        this.totalAccounts.available = {
          ...this.totalAccounts.available,
          soldeNotChecked: value
        }
      },

      totalGlobal (value) {
        this.totalAccounts.all = {
          ...this.totalAccounts.all,
          soldeNotChecked: value
        }
      },

      totalRetraite (value) {
        this.totalAccounts.retraite = {
          ...this.totalAccounts.retraite,
          soldeNotChecked: value
        }
      }
    }
  }
</script>

<style>
.hr-point {
  height: none;
  border: none;
  border-top: 1px dashed rgba(0, 0, 0, 0.1);
}
</style>
