import {
  deleteOperation,
  fetchOperationsForAccount,
  fetchRecurrOperation,
  fetchSearchOperations,
  updateOperation,
  fetchOperations
} from '@/services/operation'

export default {
  state: {
    operationsOfActiveAccount: undefined
  },

  getters: {
    operationFromCurrentList ({ operationsOfActiveAccount }) {
      return (operationID) => {
        return operationsOfActiveAccount.find(operation => parseInt(operationID) === operation.IDop)
      }
    }
  },

  mutations: {
    setOperationsOfActiveAccount (state, operations) {
      state.operationsOfActiveAccount = operations
    }
  },

  actions: {
    fetchOperationsOfActiveAccount ({ rootState, commit }) {
      fetchOperationsForAccount(rootState.compte.activeAccount.IDcompte, rootState.user.token, import.meta.env.VITE_API_URL)
        .then((operations) => {
          commit('setOperationsOfActiveAccount', operations)
        })
    },

    async updateOperation ({ dispatch, rootState }, operation) {
      await updateOperation(operation, rootState.user.token, import.meta.env.VITE_API_URL)

      dispatch('fetchActiveAccount', operation.IDcompte)
    },

    async deleteOperation ({ dispatch, rootState }, operation) {
      await deleteOperation(operation.IDop, rootState.user.token, import.meta.env.VITE_API_URL)

      dispatch('fetchActiveAccount', operation.IDcompte)
    },

    async createTransfert ({ dispatch, rootState }, operation) {
      const positiveMontant = parseFloat(operation.MontantOp > 0 ? operation.MontantOp : operation.MontantOp * -1)

      await updateOperation({
        ...operation,
        MontantOp: positiveMontant * -1,
        IDcompte: operation.IDcompteDebit
      }, rootState.user.token, import.meta.env.VITE_API_URL)

      await updateOperation({
        ...operation,
        MontantOp: positiveMontant,
        IDcompte: operation.IDcompteCredit
      }, rootState.user.token, import.meta.env.VITE_API_URL)

      dispatch('fetchActiveAccount', operation.IDcompteDebit)
    },

    fetchRecurrOperation ({ rootState, commit }) {
      commit('setOperationsOfActiveAccount', {})
      commit('setActiveAccount', { NomCompte: 'Opérations récurrentes' })

      fetchRecurrOperation(rootState.user.token, import.meta.env.VITE_API_URL)
        .then((operations) => {
          commit('setOperationsOfActiveAccount', operations)
        })
    },

    getSearchOperations ({ rootState, commit }, searchTerms) {
      fetchSearchOperations(searchTerms, rootState.compte.accountList, rootState.user.token, import.meta.env.VITE_API_URL)
        .then((operations) => {
          commit('setActiveAccount', { NomCompte: 'Search' })
          commit('setOperationsOfActiveAccount', operations)
        })
    },
    fetchOperations ({ rootState, commit }, where) {
      fetchOperations(where, rootState.user.token, import.meta.env.VITE_API_URL)
        .then((operations) => {
          commit('setOperationsOfActiveAccount', operations)
        })
    }
  }
}
