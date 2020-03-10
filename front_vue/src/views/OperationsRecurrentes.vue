<template>
  <div>
    <operation-recurrente v-for="operation in operationsRecurrenteList"
                          :key="'operation-recu-' + operation.IDopRecu"
                          v-bind="{operation}"
                          recurr="true"/>
  </div>
</template>

<script>
  import { mapGetters, mapState } from 'vuex'
  import OperationRecurrente from '../components/OperationRecurrente'

  export default {
    name: 'RecurrOperation',

    components: { OperationRecurrente },

    watch: {
      userToken () {
        this.$store.dispatch('fetchRecurrOperation')
      }
    },

    computed: {
      ...mapState({
        userToken: state => state.user.token
      }),

      ...mapGetters(['operationsOfActiveAccount']),

      operationsRecurrenteList () {
        if (this.operationsOfActiveAccount[0] && this.operationsOfActiveAccount[0].IDopRecu !== undefined) {
          return this.operationsOfActiveAccount
        }
        return []
      }
    },

    created () {
      if (this.userToken) {
        this.$store.dispatch('fetchRecurrOperation')
      }
    }
  }
</script>
