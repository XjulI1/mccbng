import {
  deleteOperation,
  fetchOperationsForAccount,
  fetchRecurrOperation,
  fetchSearchOperations,
  updateOperation,
  fetchOperations,
  updateRecurringOperation,
  deleteRecurringOperation
} from '@/services/operation'

export default {
  state: {
    operationsOfActiveAccount: undefined,
    recurringOperations: [],
    hasMoreOperations: true,
    isLoadingOperations: false,
    operationsSkip: 0,
    operationsLimit: 35
  },

  getters: {
    operationFromCurrentList ({ operationsOfActiveAccount }) {
      return (operationID) => {
        return operationsOfActiveAccount.find(
          (operation) => parseInt(operationID) === operation.IDop
        )
      }
    }
  },

  mutations: {
    setOperationsOfActiveAccount (state, operations) {
      state.operationsOfActiveAccount = operations
    },
    appendOperationsToActiveAccount (state, operations) {
      if (state.operationsOfActiveAccount === undefined) {
        state.operationsOfActiveAccount = operations
      } else {
        state.operationsOfActiveAccount = [...state.operationsOfActiveAccount, ...operations]
      }
    },
    setRecurringOperations (state, operations) {
      state.recurringOperations = operations
    },
    setHasMoreOperations (state, hasMore) {
      state.hasMoreOperations = hasMore
    },
    setIsLoadingOperations (state, isLoading) {
      state.isLoadingOperations = isLoading
    },
    setOperationsSkip (state, skip) {
      state.operationsSkip = skip
    },
    resetOperationsPagination (state) {
      state.operationsSkip = 0
      state.hasMoreOperations = true
    }
  },

  actions: {
    fetchOperationsOfActiveAccount ({ rootState, commit, state }) {
      commit('resetOperationsPagination')
      commit('setIsLoadingOperations', true)

      fetchOperationsForAccount(
        rootState.compte.activeAccount.IDcompte,
        rootState.user.token,
        import.meta.env.VITE_API_URL,
        0,
        state.operationsLimit
      ).then((operations) => {
        commit('setOperationsOfActiveAccount', operations)
        commit('setOperationsSkip', state.operationsLimit)
        commit('setHasMoreOperations', operations.length === state.operationsLimit)
        commit('setIsLoadingOperations', false)
      }).catch(() => {
        commit('setIsLoadingOperations', false)
      })
    },

    loadMoreOperations ({ rootState, commit, state }) {
      if (!state.hasMoreOperations || state.isLoadingOperations) {
        return Promise.resolve()
      }

      commit('setIsLoadingOperations', true)

      return fetchOperationsForAccount(
        rootState.compte.activeAccount.IDcompte,
        rootState.user.token,
        import.meta.env.VITE_API_URL,
        state.operationsSkip,
        state.operationsLimit
      ).then((operations) => {
        commit('appendOperationsToActiveAccount', operations)
        commit('setOperationsSkip', state.operationsSkip + operations.length)
        commit('setHasMoreOperations', operations.length === state.operationsLimit)
        commit('setIsLoadingOperations', false)
      }).catch(() => {
        commit('setIsLoadingOperations', false)
      })
    },

    async updateOperation ({ dispatch, rootState }, operation) {
      await updateOperation(
        operation,
        rootState.user.token,
        import.meta.env.VITE_API_URL
      )

      dispatch('fetchActiveAccount', operation.IDcompte)
    },

    async deleteOperation ({ dispatch, rootState }, operation) {
      await deleteOperation(
        operation.IDop,
        rootState.user.token,
        import.meta.env.VITE_API_URL
      )

      dispatch('fetchActiveAccount', operation.IDcompte)
    },

    async createTransfert ({ dispatch, rootState }, operation) {
      const positiveMontant = parseFloat(
        operation.MontantOp > 0 ? operation.MontantOp : operation.MontantOp * -1
      )

      await updateOperation(
        {
          ...operation,
          MontantOp: positiveMontant * -1,
          IDcompte: operation.IDcompteDebit
        },
        rootState.user.token,
        import.meta.env.VITE_API_URL
      )

      await updateOperation(
        {
          ...operation,
          MontantOp: positiveMontant,
          IDcompte: operation.IDcompteCredit
        },
        rootState.user.token,
        import.meta.env.VITE_API_URL
      )

      dispatch('fetchActiveAccount', operation.IDcompteDebit)
    },

    fetchRecurrOperation ({ rootState, commit }) {
      commit('setOperationsOfActiveAccount', {})
      commit('setActiveAccount', { NomCompte: 'Opérations récurrentes' })

      fetchRecurrOperation(
        rootState.user.token,
        import.meta.env.VITE_API_URL
      ).then((operations) => {
        commit('setOperationsOfActiveAccount', operations)
        commit('setRecurringOperations', operations)
      })
    },

    async updateRecurringOperation (
      { dispatch, rootState },
      operationRecurrente
    ) {
      await updateRecurringOperation(
        {
          ...operationRecurrente,
          Frequence: parseInt(operationRecurrente.Frequence)
        },
        rootState.user.token,
        import.meta.env.VITE_API_URL
      )

      dispatch('fetchRecurrOperation')
    },

    async deleteRecurringOperation (
      { dispatch, rootState },
      operationRecurrente
    ) {
      await deleteRecurringOperation(
        operationRecurrente.IDopRecu,
        rootState.user.token,
        import.meta.env.VITE_API_URL
      )

      dispatch('fetchRecurrOperation')
    },

    getSearchOperations ({ rootState, commit }, searchTerms) {
      fetchSearchOperations(
        searchTerms,
        rootState.compte.accountList,
        rootState.user.token,
        import.meta.env.VITE_API_URL
      ).then((operations) => {
        commit('setActiveAccount', { NomCompte: 'Search' })
        commit('setOperationsOfActiveAccount', operations)
      })
    },
    fetchOperations ({ rootState, commit }, where) {
      fetchOperations(
        where,
        rootState.user.token,
        import.meta.env.VITE_API_URL
      ).then((operations) => {
        commit('setOperationsOfActiveAccount', operations)
      })
    }
  }
}
