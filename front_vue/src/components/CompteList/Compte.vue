<template>
  <div class="account-informations" :class="classPointer" @click="getAccountDetails">
    <div class="account-name" :class="classBoldTitle">
      <font-awesome-icon :icon="fa_icon" class="icon-fa" v-if="fa_icon"/>
      {{accountInformations.NomCompte}}
    </div>
    <div class="account-solde" :class="soldeColor">
      {{accountInformations.solde.toLocaleString()}} {{$store.state.currency}}
    </div>
    <div class="warning-infos" :class="soldeColor" v-if="warning">
      {{(accountInformations.solde - warning).toLocaleString()}} {{$store.state.currency}}
    </div>
  </div>
</template>

<script>
  import 'mccbng_styles/components/Account.scss'

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
