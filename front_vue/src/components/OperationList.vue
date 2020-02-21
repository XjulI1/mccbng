<template>
  <div class="operation-list">
    <operation v-for="operation in operationsOfActiveAccount"
               v-bind:key="'operation-' + operation.IDop"
               v-if="operation.IDop"
               :operation="operation"/>

    <operation-recurrente v-else-if="operation.IDopRecu"
                          v-bind:key="'operation-recu-' + operation.IDopRecu"
                          :operation="operation"
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

    computed: mapGetters(['operationsOfActiveAccount'])
  }
</script>

<style scoped>
  .operation-list {
    width: 100%
  }
</style>
