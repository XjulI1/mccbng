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
      <img
        v-if="imgID"
        class="banque-img"
        :src="`/img/banques/banque-${imgID}.png`"
      >
      <font-awesome-icon
        v-else-if="faIcon"
        :icon="faIcon"
        class="icon-fa"
      />
      {{ accountInformations.NomCompte }}
    </div>
    <div
      class="account-solde"
      :class="soldeColor"
    >
      <Currency :amount="(accountInformations.soldeNotChecked || 0)" />
    </div>
    <div
      v-if="warning"
      class="warning-infos"
      :class="soldeColor"
    >
      <Currency :amount="((accountInformations.soldeNotChecked || 0) - warning)" />
    </div>
  </div>
</template>

<script>
  import '@/styles/components/Account.scss'
  import Currency from '../Currency'

  export default {
    name: 'Compte',
    components: { Currency },
    /* eslint-disable vue/require-prop-types */

    props: ['accountInformations', 'boldTitle', 'disableClick', 'noColor', 'warning', 'faIcon'],

    data () {
      return {
        soldeColor: this.getSoldeColor(),
        classBoldTitle: this.boldTitle ? 'bold-title' : '',
        classPointer: this.disableClick ? '' : 'cursor-pointer'
      }
    },

    computed: {
      imgID () {
        return this.accountInformations.banque ? this.accountInformations.banque.IDbanque : 0
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
<style scoped>
.banque-img {
  width: 20px;
  vertical-align: text-bottom;
}
</style>
