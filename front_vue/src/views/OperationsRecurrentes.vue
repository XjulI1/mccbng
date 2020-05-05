<template>
  <div>
    <operation-recurrente
      v-for="operation in operationsRecurrenteList"
      :key="'operation-recu-' + operation.IDopRecu"
      v-bind="{operation}"
      recurr="true"
    />
  </div>
</template>

<script>
  import { mapState } from 'vuex'
  import OperationRecurrente from '@/components/OperationRecurrente'

  export default {
    name: 'RecurrOperation',

    components: { OperationRecurrente },

    computed: {
      ...mapState({
        userToken: state => state.user.token,
        operationsOfActiveAccount: state => state.operation.operationsOfActiveAccount
      }),

      operationsRecurrenteList () {
        if (this.operationsOfActiveAccount[0] && this.operationsOfActiveAccount[0].IDopRecu !== undefined) {
          return this.operationsOfActiveAccount
        }
        return []
      }
    },

    watch: {
      userToken () {
        this.$store.dispatch('fetchRecurrOperation')
      }
    },

    created () {
      if (this.userToken) {
        this.$store.dispatch('fetchRecurrOperation')
      }
    }
  }
</script>
