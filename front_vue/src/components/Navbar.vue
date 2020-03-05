<template>
  <div class="navbar btn-group" role="group">
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

<style lang="scss" scoped>
  .navbar {
    padding: 0;
    height: $navbar-height;
    width: $left-panel-width;
    background-color: white;
    position: fixed;
    bottom: 0;
    left: 0;
    display: inline;
    text-align: center;
    z-index: 100;

    @media screen and (max-width: 768px) {
      width: 100%;
    }

    &.btn-group {
      .all-account-button, .virement-button, .operation-recurrente-button, .params-button {
        width: 19%;
        height: $navbar-height;
        font-size: 1.2rem;
        line-height: 1.1rem;
        font-weight: 600;
      }

      .new-operation-button {
        width: 24%;
        height: $navbar-height;
        font-size: 1.3rem;
        line-height: 1.1rem;
        font-weight: 600;
      }
    }
  }
</style>
