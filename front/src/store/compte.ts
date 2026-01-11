import { generateRecurringOperations } from '@/services/operation'
import { fetchAccountList, sumAllCompteForUser, sumForACompte } from '@/services/compte'

// Utility functions for mutations and actions

const calcActiveAccountBalances = (activeAccount, { TotalChecked, TotalNotChecked }) => {
  TotalChecked = parseFloat(TotalChecked || 0)
  TotalNotChecked = parseFloat(TotalNotChecked || 0)

  return {
    ...activeAccount,
    soldeChecked: Math.round(TotalChecked * 100) / 100,
    soldeNotChecked: Math.round((TotalChecked + TotalNotChecked) * 100) / 100
  }
}

const setSumAllAccountForUser = (accountList, sumList) => {
  return accountList.map((account) => {
    const sum = sumList.filter(sum => sum.IDCompte === account.IDcompte)

    if (sum[0]) {
      account = calcActiveAccountBalances(account, {
        TotalChecked: sum[0].TotalChecked,
        TotalNotChecked: sum[0].TotalNotChecked
      })
    }

    return account
  })
}

const updateSoldeInAccountList = (accountList, IDcompte, solde) => {
  return accountList.map((account) => {
    if (account.IDcompte === IDcompte) {
      account.soldeNotChecked = solde
    }
    return account
  })
}

export default {
  state: {
    activeAccount: {},
    accountList: [],
    currency: '€'
  },

  getters: {
    bloquedCompte: (_, { visibleAccounts }) => {
      return visibleAccounts.filter((account) => {
        if (account.bloque && !account.retraite && !account.joint && !account.children) {
          return account
        }
        return undefined
      })
    },

    retraiteCompte: (_, { visibleAccounts }) => {
      return visibleAccounts.filter((account) => {
        if (account.retraite) {
          return account
        }
        return undefined
      })
    },

    availableCompte: (_, { visibleAccounts }) => {
      return visibleAccounts.filter((account) => {
        if (!account.bloque && !account.porte_feuille) {
          return account
        }
        return undefined
      })
    },

    porteFeuilleCompte: (_, { visibleAccounts }) => {
      return visibleAccounts.filter((account) => {
        if (account.porte_feuille) {
          return account
        }
        return undefined
      })
    },

    jointCompte: (_, { visibleAccounts }) => {
      return visibleAccounts.filter((account) => {
        if (account.joint) {
          return account
        }
        return undefined
      })
    },

    childrenCompte: (_, { visibleAccounts }) => {
      return visibleAccounts.filter((account) => {
        if (account.children) {
          return account
        }
        return undefined
      })
    },

    totalAvailable: (_, { availableCompte, porteFeuilleCompte }) => {
      const availableAndPorteFeuilleAccounts = availableCompte.concat(porteFeuilleCompte)

      return availableAndPorteFeuilleAccounts.reduce((acc, account) => {
        acc += account.soldeNotChecked
        return Math.round(acc * 100) / 100
      }, 0)
    },

    totalGlobal: (_, { bloquedCompte, jointCompte, totalAvailable }) => {
      return [].concat(bloquedCompte, jointCompte).reduce((acc, account: any) => {
        acc += account.soldeNotChecked
        return Math.round(acc * 100) / 100
      }, totalAvailable)
    },

    totalRetraite: (_, { retraiteCompte }) => {
      return retraiteCompte.reduce((acc, account) => {
        acc += account.soldeNotChecked
        return Math.round(acc * 100) / 100
      }, 0)
    },

    totalJoint: (_, { jointCompte }) => {
      return jointCompte.reduce((acc, account) => {
        acc += account.soldeNotChecked
        return Math.round(acc * 100) / 100
      }, 0)
    },

    totalChildren: (_, { childrenCompte }) => {
      return childrenCompte.reduce((acc, account) => {
        acc += account.soldeNotChecked
        return Math.round(acc * 100) / 100
      }, 0)
    },

    getAccount: ({ accountList }) => {
      return (IDcompte) => {
        return accountList.find(account => account.IDcompte === parseInt(IDcompte))
      }
    },

    visibleAccounts: ({ accountList }) => {
      return accountList.filter((account) => {
        if (account.visible) {
          return account
        }
        return undefined
      })
    }
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

      sumForACompte(rootState.user.token, accountID, import.meta.env.VITE_API_URL)
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
