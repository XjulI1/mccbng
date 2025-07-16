import {
  setSumAllAccountForUser,
  filterBloquedAccounts as bloquedCompte,
  filterJointAccounts as jointCompte,
  filterChildrenAccounts as childrenCompte,
  filterRetraiteAccounts as retraiteCompte,
  filterAvailableAccounts as availableCompte,
  filterPorteFeuilleAccount as porteFeuilleCompte,
  totalAvailable,
  totalGlobal,
  totalRetraite,
  totalJoint,
  totalChildren,
  getAccount,
  calcActiveAccountBalances,
  updateSoldeInAccountList,
  visibleAccounts
} from './utils/compte'

import { generateRecurringOperations } from '@/services/operation'
import { fetchAccountList, sumAllCompteForUser, sumForACompte } from '@/services/compte'

export default {
  state: {
    activeAccount: {},
    accountList: [],
    currency: '€'
  },

  getters: {
    bloquedCompte,
    retraiteCompte,
    availableCompte,
    porteFeuilleCompte,
    jointCompte,
    childrenCompte,
    totalAvailable,
    totalGlobal,
    totalRetraite,
    totalJoint,
    totalChildren,
    getAccount,
    visibleAccounts
  },

  mutations: {
    setActiveAccount (state, activeAccount) {
      state.activeAccount = activeAccount
    },

    setNewBalances (state, { TotalChecked, TotalNotChecked }) {
      state.activeAccount = calcActiveAccountBalances(state.activeAccount, { TotalChecked, TotalNotChecked })
      state.accountList = updateSoldeInAccountList(state.accountList, state.activeAccount.IDcompte, state.activeAccount.soldeNotChecked)
    },

    setAccountList (state, accountList) {
      state.accountList = accountList
    },

    setSumAllCompteForUser (state, sumList) {
      state.accountList = setSumAllAccountForUser(state.accountList, sumList)
    }
  },

  actions: {
    async fetchUserByIDAndGenerateRecurringOp ({ dispatch }, userID) {
      await dispatch('fetchUser', userID)

      dispatch('generateRecurringOperations')
    },

    generateRecurringOperations ({ rootState }) {
      generateRecurringOperations(rootState.user.id, rootState.user.token, import.meta.env.VITE_API_URL)
    },

    fetchActiveAccount ({ state, commit, getters, dispatch, rootState }, accountID) {
      commit('setActiveAccount', getters.getAccount(accountID))

      dispatch('fetchOperationsOfActiveAccount')

      sumForACompte(rootState.user.token, state.activeAccount.IDcompte, import.meta.env.VITE_API_URL)
        .then(({ TotalChecked, TotalNotChecked }) => {
          commit('setNewBalances', { TotalChecked, TotalNotChecked })
        })
    },

    fetchAccountList ({ rootState, commit }) {
      const userID = rootState.user.id
      const userToken = rootState.user.token
      const APIURL = import.meta.env.VITE_API_URL

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
