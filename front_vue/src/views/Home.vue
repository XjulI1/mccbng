<template>
  <div class="home">
    <router-view />
    <div class="operation-list">
      <operation
        v-for="operation in operationsList"
        :key="'operation-' + operation.IDop"
        v-bind="{operation, draggableActif}"
      />
      <categories-drop-zone v-if="draggableActif" />
    </div>
  </div>
</template>

<script>
  import { mapState } from 'vuex'
  import CategoriesDropZone from '../components/Home/CategoriesDropZone'
  import Operation from '../components/Home/Operation'

  export default {
    name: 'Home',

    components: { CategoriesDropZone, Operation },

    data () {
      return {
        draggableActif: true
      }
    },

    computed: {
      ...mapState({
        userFavoris: state => state.user.favoris,
        accountList: state => state.compte.accountList,
        operationsOfActiveAccount: state => state.operation.operationsOfActiveAccount
      }),

      operationsList () {
        if (this.operationsOfActiveAccount[0] && this.operationsOfActiveAccount[0].IDop !== undefined) {
          return this.operationsOfActiveAccount
        }
        return []
      }
    },

    watch: {
      accountList () {
        if (this.operationsOfActiveAccount.length === 0) {
          this.$store.dispatch('fetchActiveAccount', this.userFavoris)
        }
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
