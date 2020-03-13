import Vue from 'vue'
import Vuex from 'vuex'

import User from './user.js'
import Category from './category.js'
import Operation from './operation.js'
import Dispay from './display'
import Stats from './stats'

import { fetchAccountList, sumAllCompteForUser, sumForACompte } from 'mccbng_services/compte'
import { generateRecurringOperations } from 'mccbng_services/operation'
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

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    user: User,
    category: Category,
    operation: Operation,
    display: Dispay,
    stats: Stats
  },

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

    generateRecurringOperations ({ state }) {
      generateRecurringOperations(state.user.id, state.user.token, process.env.VUE_APP_API_URL)
    },

    fetchActiveAccount (context, accountID) {
      context.commit('setActiveAccount', context.getters.getAccount(accountID))

      context.dispatch('fetchOperationsOfActiveAccount')

      sumForACompte(context.state.user.token, context.state.activeAccount.IDcompte, process.env.VUE_APP_API_URL)
        .then(({ TotalChecked, TotalNotChecked }) => {
          context.commit('setNewBalances', { TotalChecked, TotalNotChecked })
        })
    },

    fetchAccountList ({ state, commit }) {
      const userID = state.user.id
      const userToken = state.user.token
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
})
