<template>
  <div
    class="account-informations"
    :class="classPointer"
    @click="getAccountDetails"
  >
    <div
      class="account-name"
      :class="classBoldTitle"
    >
      <font-awesome-icon
        v-if="fa_icon"
        :icon="fa_icon"
        class="icon-fa"
      />
      {{ accountInformations.NomCompte }}
    </div>
    <div
      class="account-solde"
      :class="soldeColor"
    >
      {{ (accountInformations.soldeNotChecked || 0).toLocaleString() }} {{ $store.state.compte.currency }}
    </div>
    <div
      v-if="warning"
      class="warning-infos"
      :class="soldeColor"
    >
      {{ ((accountInformations.soldeNotChecked || 0) - warning).toLocaleString() }} {{ $store.state.compte.currency }}
    </div>
  </div>
</template>

<script>
  import 'mccbng_styles/components/Account.scss'

  export default {
    name: 'Compte',
    props: ['accountInformations', 'boldTitle', 'disableClick', 'noColor', 'warning', 'fa_icon'],

    data () {
      return {
        soldeColor: this.getSoldeColor(),
        classBoldTitle: this.boldTitle ? 'bold-title' : '',
        classPointer: this.disableClick ? '' : 'cursor-pointer'
      }
    },

    watch: {
      'accountInformations.soldeNotChecked' () {
        this.soldeColor = this.getSoldeColor()
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

        if (this.accountInformations.soldeNotChecked < this.warning) {
          return 'soldeWarning'
        }

        return this.accountInformations.soldeNotChecked >= 0 ? 'soldeIn' : 'soldeOut'
      }
    }
  }
</script>
