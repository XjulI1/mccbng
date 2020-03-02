import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios/index'

import User from './user.js'
import Category from './category.js'
import Operation from './operation.js'
import Dispay from './display'
import Stats from './stats'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    user: User,
    category: Category,
    operation: Operation,
    display: Dispay,
    stats: Stats
  },
  state: {
    activeAccount: {},
    accountList: [],
    currency: '€'
  },
  getters: {
    bloquedCompte (state) {
      return state.accountList.filter((account) => {
        if (account.bloque) {
          return account
        }
      })
    },

    availableCompte (state) {
      return state.accountList.filter((account) => {
        if (!account.bloque && !account.porte_feuille) {
          return account
        }
      })
    },

    porteFeuilleCompte (state) {
      return state.accountList.filter((account) => {
        if (account.porte_feuille) {
          return account
        }
      })
    },

    totalAvailable (state, getters) {
      const availableAndPorteFeuilleAccounts = getters.availableCompte.concat(getters.porteFeuilleCompte)

      return availableAndPorteFeuilleAccounts.reduce((acc, account) => {
        acc += account.solde
        return Math.round(acc * 100) / 100
      }, 0)
    },

    totalGlobal (state, getters) {
      return getters.bloquedCompte.reduce((acc, account) => {
        acc += account.solde
        return Math.round(acc * 100) / 100
      }, getters.totalAvailable)
    },

    getAccountName (state) {
      return (IDcompte) => {
        return state.accountList.filter((account) => {
          if (account.IDcompte === parseInt(IDcompte)) {
            return account
          }
        })
      }
    }
  },
  mutations: {
    setActiveAccount (state, activeAccount) {
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
      state.accountList = accountList

      state.accountList.map((account) => {
        account.base_solde = account.solde
      })
    },

    setSumAllCompteForUser (state, sumList) {
      state.accountList.forEach((account, index) => {
        const sum = sumList.filter(sum => sum.IDCompte === account.IDcompte)

        if (sum[0]) {
          const account = state.accountList[index]

          account.base_solde += sum[0].TotalChecked + (sum[0].TotalNotChecked || 0)
          account.base_solde = Math.round(account.base_solde * 100) / 100

          account.solde = account.base_solde
        }
      })
    }
  },
  actions: {
    initialState () {
    },

    fetchUserByIDAndActiveAccount (context, userID) {
      this.dispatch('fetchUser', userID)
        .then(() => {
          this.dispatch('fetchActiveAccount', this.state.user.favoris)
          this.dispatch('generateRecurringOperations')
        })
    },

    fetchActiveAccount (context, accountID) {
      axios.get(process.env.VUE_APP_API_URL + '/api/Comptes/' + accountID, {
        params: {
          access_token: context.rootState.user.token
        }
      }).then((response) => {
        context.commit('setActiveAccount', response.data)

        this.dispatch('fetchOperationsOfActiveAccount')
        this.dispatch('fetchSumForACompte')
      })
    },

    fetchAccountList (context) {
      const filter = { where: { IDuser: this.state.user.id, visible: true }, order: 'NomCompte ASC' }

      axios.get(process.env.VUE_APP_API_URL + '/api/Comptes', {
        params: {
          access_token: context.rootState.user.token,
          filter
        }
      }).then((response) => {
        context.commit('setAccountList', response.data)

        this.dispatch('sumAllCompteForUser')
      })
    },

    fetchSumForACompte (context) {
      axios.get(process.env.VUE_APP_API_URL + '/api/Operations/sumForACompte', {
        params: {
          access_token: context.rootState.user.token,
          id: this.state.activeAccount.IDcompte
        }
      }).then((response) => {
        context.commit('setCheckedSolde', response.data.results.TotalChecked)
        context.commit('setNotCheckedSolde', response.data.results.TotalNotChecked)
      })
    },

    sumAllCompteForUser (context) {
      axios.get(process.env.VUE_APP_API_URL + '/api/Operations/sumAllCompteForUser', {
        params: {
          access_token: context.rootState.user.token,
          userID: this.state.user.id
        }
      }).then((response) => {
        context.commit('setSumAllCompteForUser', response.data.results)
      })
    },

    generateRecurringOperations (context) {
      axios.post(process.env.VUE_APP_API_URL + '/api/OperationRecurrentes/autoGeneration?access_token=' + context.rootState.user.token, {
        userID: this.state.user.id
      })
    }
  }
})
