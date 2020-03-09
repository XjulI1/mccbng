<template>
  <div class="nav-bar btn-group" role="group">
    <button class="btn btn-warning all-account-button" v-on:click="openAllAccount">
      <font-awesome-icon icon="list"/>
    </button>
    <button class="btn btn-success disabled virement-button" v-on:click="doTransfert">
      <font-awesome-icon icon="exchange-alt"/>
    </button>
    <button class="btn btn-primary new-operation-button" v-on:click="addOperation" v-bind="{disabled}">
      <font-awesome-icon icon="plus"/>
    </button>
    <button class="btn btn-info operation-recurrente-button" v-on:click="getRecurrenteOp">
      <font-awesome-icon icon="retweet"/>
    </button>
    <button class="btn btn-danger params-button" v-on:click="changeParams">
      <font-awesome-icon icon="cogs"/>
    </button>
  </div>
</template>

<script>
  import 'mccbng_styles/components/NavBar.scss'

  export default {
    name: 'navbar',

    computed: {
      disabled () {
        return this.$route.meta.disabledTotalHeader === undefined ? false : this.$route.meta.disabledTotalHeader
      }
    },

    methods: {
      openAllAccount () {
        this.$store.dispatch('toggleAccountList')
      },

      addOperation () {
        this.$router.push('/newOperation')
      },

      doTransfert () {
      },

      getRecurrenteOp () {
        this.$router.push('/recurrOperation')
      },

      changeParams () {
        this.$router.push('/config')
      }
    }
  }
</script>
