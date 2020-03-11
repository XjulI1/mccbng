import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios/index'

import User from './user.js'
import Category from './category.js'
import Operation from './operation.js'
import Dispay from './display'
import Stats from './stats'

import { fetchAccountList, sumAllCompteForUser } from 'mccbng_services/compte'
import {
  initialState,
  createBaseSoldeIntoEachAccount,
  setSumAllAccountForUser,
  filterBloquedAccounts as bloquedCompte,
  filterAvailableAccounts as availableCompte,
  filterPorteFeuilleAccount as porteFeuilleCompte,
  totalAvailable,
  totalGlobal,
  getAccount
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
      activeAccount.solde = activeAccount.base_solde

      state.activeAccount = activeAccount
    },

    setCheckedSolde (state, TotalChecked) {
      Vue.set(state.activeAccount, 'soldeChecked', Math.round((state.activeAccount.solde + TotalChecked) * 100) / 100)
    },

    setNotCheckedSolde (state, TotalNotChecked) {
      TotalNotChecked = parseFloat(TotalNotChecked || 0)
      TotalNotChecked = Math.round((state.activeAccount.soldeChecked + TotalNotChecked) * 100) / 100

      Vue.set(state.activeAccount, 'soldeNotChecked', TotalNotChecked)

      state.accountList.find((account) => {
        if (account.IDcompte === state.activeAccount.IDcompte) {
          account.solde = TotalNotChecked
          return account
        }
      })
    },

    setAccountList (state, accountList) {
      state.accountList = createBaseSoldeIntoEachAccount(accountList)
    },

    setSumAllCompteForUser (state, sumList) {
      state.accountList = setSumAllAccountForUser(state.accountList, sumList)
    }
  },

  actions: {
    fetchUserByIDAndGenerateRecurringOp (context, userID) {
      context.dispatch('fetchUser', userID)
        .then(() => {
          context.dispatch('generateRecurringOperations')
        })
    },

    fetchActiveAccount (context, accountID) {
      context.commit('setActiveAccount', context.getters.getAccount(accountID))

      context.dispatch('fetchOperationsOfActiveAccount')

      axios.get(process.env.VUE_APP_API_URL + '/api/Operations/sumForACompte', {
        params: {
          access_token: context.rootState.user.token,
          id: context.state.activeAccount.IDcompte
        }
      }).then((response) => {
        context.commit('setCheckedSolde', response.data.results.TotalChecked)
        context.commit('setNotCheckedSolde', response.data.results.TotalNotChecked)
      })
    },

    fetchAccountList (context) {
      const userID = context.state.user.id
      const userToken = context.rootState.user.token
      const APIURL = process.env.VUE_APP_API_URL

      fetchAccountList(userID, userToken, APIURL)
        .then((accountList) => {
          context.commit('setAccountList', accountList)

          return sumAllCompteForUser(userID, userToken, APIURL)
        })
        .then((sumList) => {
          context.commit('setSumAllCompteForUser', sumList)
        })
    },

    generateRecurringOperations (context) {
      axios.post(process.env.VUE_APP_API_URL + '/api/OperationRecurrentes/autoGeneration?access_token=' + context.rootState.user.token, {
        userID: context.state.user.id
      })
    }
  }
})
