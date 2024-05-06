<template>
  <div class="operation-list">
    <component
      :is="OperationRenderer"
      v-for="operation in operationsList"
      :key="'operation-' + operation.IDop"
      v-bind="{ operation }"
    />
  </div>
</template>

<script>
  import { mapState } from 'vuex'

  export default {
    name: 'OperationList',
    props: { OperationRenderer: { type: Object, required: true } },

    computed: {
      ...mapState({
        userFavoris: (state) => state.user.favoris,
        accountList: (state) => state.compte.accountList,
        operationsOfActiveAccount: (state) =>
          state.operation.operationsOfActiveAccount
      }),

      operationsList () {
        if (
          this.operationsOfActiveAccount &&
          this.operationsOfActiveAccount[0] &&
          this.operationsOfActiveAccount[0].IDop !== undefined
        ) {
          return this.operationsOfActiveAccount
        }
        return []
      }
    },

    watch: {
      accountList () {
        if (this.operationsOfActiveAccount === undefined) {
          this.$store.dispatch('fetchActiveAccount', this.userFavoris)
        }
      }
    }
  }
</script>
<style lang="scss" scoped>
.operation-list {
  width: 100%;
}
</style>
