<template>
  <div
    class="nav-bar btn-group"
    role="group"
  >
    <button
      class="btn btn-warning virement-button"
      v-bind="{ disabled }"
      @click="doTransfert"
    >
      <font-awesome-icon icon="exchange-alt" />
    </button>
    <button
      class="btn btn-success amortissement-button"
      @click="getAmortissement"
    >
      <font-awesome-icon icon="history" />
    </button>
    <button
      class="btn btn-primary new-operation-button"
      v-bind="{ disabled }"
      @click="addOperation"
    >
      <font-awesome-icon icon="plus" />
    </button>
    <button
      class="btn btn-info operation-recurrente-button"
      @click="getRecurrenteOp"
    >
      <font-awesome-icon icon="retweet" />
    </button>
    <button
      class="btn btn-danger params-button"
      @click="changeParams"
    >
      <font-awesome-icon icon="cogs" />
    </button>
  </div>
</template>

<script>
  import '@/styles/components/NavBar.scss'

  export default {
    name: 'Navbar',

    computed: {
      disabled () {
        return this.$route.meta.disabledTotalHeader === undefined
          ? false
          : this.$route.meta.disabledTotalHeader
      }
    },

    methods: {
      addOperation () {
        this.$store.dispatch('toggleAccountList', false)
        this.$router.push('/newOperation')
      },

      doTransfert () {
        this.$store.dispatch('toggleAccountList', false)
        this.$router.push('/transfert')
      },

      getRecurrenteOp () {
        this.$store.dispatch('toggleAccountList', false)
        this.$router.push('/recurrOperation')
      },

      getAmortissement () {
        this.$store.dispatch('toggleAccountList', false)
        this.$router.push('/amortissement')
      },

      changeParams () {
        this.$store.dispatch('toggleAccountList', false)
        this.$router.push('/config')
      }
    }
  }
</script>
