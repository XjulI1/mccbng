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
        v-if="faIcon"
        :icon="faIcon"
        class="icon-fa"
      />
      {{ accountInformations.NomCompte }}
    </div>
    <div
      class="account-solde"
      :class="soldeColor"
    >
      {{ (accountInformations.soldeNotChecked || 0).toLocaleString() }} {{ currency }}
    </div>
    <div
      v-if="warning"
      class="warning-infos"
      :class="soldeColor"
    >
      {{ ((accountInformations.soldeNotChecked || 0) - warning).toLocaleString() }} {{ currency }}
    </div>
  </div>
</template>

<script>
  import 'mccbng_styles/components/Account.scss'
  import { mapState } from 'vuex'

  export default {
    name: 'Compte',

    /* eslint-disable vue/require-prop-types */

    props: ['accountInformations', 'boldTitle', 'disableClick', 'noColor', 'warning', 'faIcon'],

    data () {
      return {
        soldeColor: this.getSoldeColor(),
        classBoldTitle: this.boldTitle ? 'bold-title' : '',
        classPointer: this.disableClick ? '' : 'cursor-pointer'
      }
    },

    computed: mapState({ currency: state => state.compte.currency }),

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
