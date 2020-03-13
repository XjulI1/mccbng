<template>
  <div class="home">
    <router-view />
    <div class="operation-list">
      <operation
        v-for="operation in operationsList"
        :key="'operation-' + operation.IDop"
        v-bind="{operation}"
      />
      <categories-drop-zone />
    </div>
  </div>
</template>

<script>
  import { mapGetters, mapState } from 'vuex'
  import CategoriesDropZone from '../components/Home/CategoriesDropZone'
  import Operation from '../components/Home/Operation'

  export default {
    name: 'Home',

    components: { CategoriesDropZone, Operation },

    watch: {
      accountList () {
        if (this.operationsOfActiveAccount.length === 0) {
          this.$store.dispatch('fetchActiveAccount', this.userFavoris)
        }
      }
    },

    computed: {
      ...mapState({
        userFavoris: state => state.user.favoris,
        accountList: state => state.accountList
      }),

      ...mapGetters(['operationsOfActiveAccount']),

      operationsList () {
        if (this.operationsOfActiveAccount[0] && this.operationsOfActiveAccount[0].IDop !== undefined) {
          return this.operationsOfActiveAccount
        }
        return []
      }
    }
  }
</script>

<style lang="scss" scoped>
  .operation-list {
    width: 100%
  }

  @media screen and (max-width: 767px) {
    .home {
      margin-bottom: $navbar-height;
    }
  }

  @media screen and (min-width: 768px) {
    .home {
      display: flex;
    }
  }
</style>
