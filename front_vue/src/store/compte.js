import {
  initialState,
  createBaseSoldeIntoEachAccount,
  setSumAllAccountForUser,
  filterBloquedAccounts as bloquedCompte,
  filterAvailableAccounts as availableCompte,
  filterPorteFeuilleAccount as porteFeuilleCompte,
  totalAvailable,
  totalGlobal,
  getAccount,
  initActiveAccount,
  calcActiveAccountBalances, updateSoldeInAccountList
} from 'mccbng_store/compte'

import { generateRecurringOperations } from 'mccbng_services/operation'
import { fetchAccountList, sumAllCompteForUser, sumForACompte } from 'mccbng_services/compte'

export default {
  state: initialState,

  getters: {
    bloquedCompte,
    availableCompte,
    porteFeuilleCompte,
    totalAvailable,
    totalGlobal,
    getAccount
  },

  mutations: {
    setActiveAccount (state, activeAccount) {
      state.activeAccount = initActiveAccount(activeAccount)
    },

    setNewBalances (state, { TotalChecked, TotalNotChecked }) {
      state.activeAccount = calcActiveAccountBalances(state.activeAccount, { TotalChecked, TotalNotChecked })

      state.accountList = updateSoldeInAccountList(state.accountList, state.activeAccount.IDcompte, state.activeAccount.soldeNotChecked)
    },

    setAccountList (state, accountList) {
      state.accountList = createBaseSoldeIntoEachAccount(accountList)
    },

    setSumAllCompteForUser (state, sumList) {
      state.accountList = setSumAllAccountForUser(state.accountList, sumList)
    }
  },

  actions: {
    async fetchUserByIDAndGenerateRecurringOp (context, userID) {
      await context.dispatch('fetchUser', userID)

      context.dispatch('generateRecurringOperations')
    },

    generateRecurringOperations ({ rootState }) {
      generateRecurringOperations(rootState.user.id, rootState.user.token, process.env.VUE_APP_API_URL)
    },

    fetchActiveAccount ({ state, commit, getters, dispatch, rootState }, accountID) {
      commit('setActiveAccount', getters.getAccount(accountID))

      dispatch('fetchOperationsOfActiveAccount')

      sumForACompte(rootState.user.token, state.activeAccount.IDcompte, process.env.VUE_APP_API_URL)
        .then(({ TotalChecked, TotalNotChecked }) => {
          commit('setNewBalances', { TotalChecked, TotalNotChecked })
        })
    },

    fetchAccountList ({ rootState, commit }) {
      const userID = rootState.user.id
      const userToken = rootState.user.token
      const APIURL = process.env.VUE_APP_API_URL

      fetchAccountList(userID, userToken, APIURL)
        .then((accountList) => {
          commit('setAccountList', accountList)

          return sumAllCompteForUser(userID, userToken, APIURL)
        })
        .then((sumList) => {
          commit('setSumAllCompteForUser', sumList)
        })
    }
  }
}
