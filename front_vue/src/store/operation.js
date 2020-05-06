import { initialState, operationFromCurrentList } from 'mccbng_store/operation'
import {
  deleteOperation,
  fetchOperationsForAccount,
  fetchRecurrOperation,
  fetchSearchOperations,
  updateOperation
} from 'mccbng_services/operation'

export default {
  state: initialState,

  getters: {
    operationFromCurrentList
  },

  mutations: {
    setOperationsOfActiveAccount (state, operations) {
      state.operationsOfActiveAccount = operations
    }
  },

  actions: {
    fetchOperationsOfActiveAccount ({ rootState, commit }) {
      fetchOperationsForAccount(rootState.compte.activeAccount.IDcompte, rootState.user.token, process.env.VUE_APP_API_URL)
        .then((operations) => {
          commit('setOperationsOfActiveAccount', operations)
        })
    },

    async updateOperation ({ dispatch, rootState }, operation) {
      await updateOperation(operation, rootState.user.token, process.env.VUE_APP_API_URL)

      dispatch('fetchActiveAccount', operation.IDcompte)
    },

    async deleteOperation ({ dispatch, rootState }, operation) {
      await deleteOperation(operation.IDop, rootState.user.token, process.env.VUE_APP_API_URL)

      dispatch('fetchActiveAccount', operation.IDcompte)
    },

    fetchRecurrOperation ({ rootState, commit }) {
      commit('setOperationsOfActiveAccount', {})
      commit('setActiveAccount', { NomCompte: 'Opérations récurrentes' })

      fetchRecurrOperation(rootState.user.token, process.env.VUE_APP_API_URL)
        .then((operations) => {
          commit('setOperationsOfActiveAccount', operations)
        })
    },

    getSearchOperations ({ rootState, commit }, searchTerms) {
      fetchSearchOperations(searchTerms, rootState.compte.accountList, rootState.user.token, process.env.VUE_APP_API_URL)
        .then((operations) => {
          commit('setActiveAccount', { NomCompte: 'Search' })
          commit('setOperationsOfActiveAccount', operations)
        })
    }
  }
}
