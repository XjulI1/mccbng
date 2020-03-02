<template>
  <div class="operation-list">
    <operation v-for="operation in operationsList"
               :key="'operation-' + operation.IDop"
               v-bind="{operation}"/>

    <operation-recurrente v-for="operation in operationsRecurrenteList"
                          :key="'operation-recu-' + operation.IDopRecu"
                          v-bind="{operation}"
                          recurr="true"/>

    <categories-drop-zone/>
  </div>
</template>

<script>
  import Operation from './OperationList/Operation'
  import { mapGetters } from 'vuex'
  import OperationRecurrente from './OperationList/OperationRecurrente'
  import CategoriesDropZone from './OperationList/CategoriesDropZone'

  export default {
    name: 'OperationList',
    components: { CategoriesDropZone, OperationRecurrente, Operation },

    computed: {
      ...mapGetters(['operationsOfActiveAccount']),
      operationsList () {
        if (this.operationsOfActiveAccount[0] && this.operationsOfActiveAccount[0].IDop !== undefined) {
          return this.operationsOfActiveAccount
        }
        return []
      },

      operationsRecurrenteList () {
        if (this.operationsOfActiveAccount[0] && this.operationsOfActiveAccount[0].IDopRecu !== undefined) {
          return this.operationsOfActiveAccount
        }
        return []
      }
    }
  }
</script>

<style scoped>
  .operation-list {
    width: 100%
  }
</style>
