import {
  fetchCredits,
  fetchCreditById,
  updateCredit,
  deleteCredit,
  fetchCreditRemainingBalance
} from '@/services/credit'

export default {
  state: {
    creditList: [],
    activeCredit: null,
    creditBalances: {},
    isLoadingCredits: false
  },

  getters: {
    creditFromList: (state) => (creditID) => {
      return state.creditList.find((credit) => credit.IDcredit === creditID)
    }
  },

  mutations: {
    setCreditList (state, credits) {
      state.creditList = credits
    },
    setActiveCredit (state, credit) {
      state.activeCredit = credit
    },
    setCreditBalance (state, { IDcredit, balance }) {
      state.creditBalances[IDcredit] = balance
    },
    setIsLoadingCredits (state, isLoading) {
      state.isLoadingCredits = isLoading
    }
  },

  actions: {
    async fetchCredits ({ rootState, commit }) {
      commit('setIsLoadingCredits', true)
      try {
        const credits = await fetchCredits(
          rootState.user.token,
          import.meta.env.VITE_API_URL
        )
        commit('setCreditList', credits)

        // Fetch balances for all credits
        for (const credit of credits) {
          try {
            const balance = await fetchCreditRemainingBalance(
              credit.IDcredit,
              rootState.user.token,
              import.meta.env.VITE_API_URL
            )
            commit('setCreditBalance', { IDcredit: credit.IDcredit, balance })
          } catch (error) {
            console.error('Error fetching balance for credit:', credit.IDcredit, error)
          }
        }
      } catch (error) {
        console.error('Error fetching credits:', error)
      } finally {
        commit('setIsLoadingCredits', false)
      }
    },

    async updateCredit ({ dispatch, rootState }, credit) {
      try {
        await updateCredit(
          credit,
          rootState.user.token,
          import.meta.env.VITE_API_URL
        )
        // Refresh credits list
        dispatch('fetchCredits')
      } catch (error) {
        console.error('Error updating credit:', error)
        throw error
      }
    },

    async deleteCredit ({ dispatch, rootState }, credit) {
      try {
        await deleteCredit(
          credit.IDcredit,
          rootState.user.token,
          import.meta.env.VITE_API_URL
        )
        // Refresh credits list
        dispatch('fetchCredits')
      } catch (error) {
        console.error('Error deleting credit:', error)
        throw error
      }
    },

    async fetchCreditDetails ({ rootState, commit }, IDcredit) {
      try {
        const credit = await fetchCreditById(
          IDcredit,
          rootState.user.token,
          import.meta.env.VITE_API_URL
        )
        commit('setActiveCredit', credit)

        const balance = await fetchCreditRemainingBalance(
          IDcredit,
          rootState.user.token,
          import.meta.env.VITE_API_URL
        )
        commit('setCreditBalance', { IDcredit, balance })
      } catch (error) {
        console.error('Error fetching credit details:', error)
      }
    }
  }
}
