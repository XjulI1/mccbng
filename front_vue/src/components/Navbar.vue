<template>
  <div
    class="nav-bar btn-group"
    role="group"
  >
    <button
      class="btn btn-warning all-account-button"
      @click="openAllAccount"
    >
      <font-awesome-icon icon="list" />
    </button>
    <button
      class="btn btn-success disabled virement-button"
      @click="doTransfert"
    >
      <font-awesome-icon icon="exchange-alt" />
    </button>
    <button
      class="btn btn-primary new-operation-button"
      v-bind="{disabled}"
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
  import 'mccbng_styles/components/NavBar.scss'

  export default {
    name: 'Navbar',

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
