import axios from 'axios/index'

export default {
  state: {
    operationsOfActiveAccount: []
  },
  getters: {
    operationsOfActiveAccount (state) {
      return state.operationsOfActiveAccount
    },
    operationFromCurrentList (state) {
      return (operationID) => {
        return state.operationsOfActiveAccount.filter((operation) => {
          if (parseInt(operationID) === operation.IDop) {
            return operation
          }
        })[0]
      }
    }
  },
  mutations: {
    setOperationsOfActiveAccount (state, operations) {
      state.operationsOfActiveAccount = operations
    }
  },
  actions: {
    fetchOperationsOfActiveAccount (context) {
      const filter = {
        where: { IDcompte: this.state.activeAccount.IDcompte },
        order: 'CheckOp ASC, DateOp DESC',
        limit: 35
      }

      axios.get(process.env.VUE_APP_API_URL + '/api/Operations', {
        params: {
          access_token: context.rootState.user.token,
          filter
        }
      }).then((response) => {
        context.commit('setOperationsOfActiveAccount', response.data)
      })
    },

    updateOperation: function (context, operation) {
      axios.patch(process.env.VUE_APP_API_URL + '/api/Operations', operation, {
        params: {
          access_token: context.rootState.user.token
        }
      }).then(() => {
        this.dispatch('fetchActiveAccount', operation.IDcompte)
      })
    },

    deleteOperation (context, operation) {
      axios.delete(process.env.VUE_APP_API_URL + '/api/Operations/' + operation.IDop, {
        params: {
          access_token: context.rootState.user.token
        }
      }).then(() => {
        this.dispatch('fetchActiveAccount', operation.IDcompte)
      })
    },

    fetchRecurrOperation (context) {
      context.commit('setOperationsOfActiveAccount', {})
      context.commit('setActiveAccount', { NomCompte: 'Opérations récurrentes' })

      const filter = {
        where: {},
        order: 'DernierDateOpRecu ASC, NomOpRecu ASC'
      }

      axios.get(process.env.VUE_APP_API_URL + '/api/OperationRecurrentes', {
        params: {
          access_token: context.rootState.user.token,
          filter
        }
      })
        .then((response) => {
          context.commit('setOperationsOfActiveAccount', response.data)
        })
    },

    getSearchOperations (context, searchTerms) {
      const filter = {
        where: {
          IDcompte: { inq: context.rootState.accountList.map((account) => account.IDcompte) },
          or: [
            { NomOp: { like: `%${searchTerms}%` } },
            { MontantOp: { like: `%${searchTerms}%` } }
          ]
        },
        order: 'DateOp DESC',
        limit: 30
      }

      axios.get(process.env.VUE_APP_API_URL + '/api/Operations', {
        params: {
          access_token: context.rootState.user.token,
          filter
        }
      }).then((response) => {
        context.commit('setActiveAccount', { NomCompte: 'Search' })
        context.commit('setOperationsOfActiveAccount', response.data)
      })
    }
  }
}
