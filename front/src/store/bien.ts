import {
  fetchBiens,
  fetchBienById,
  updateBien,
  deleteBien
} from '@/services/bien'

export default {
  state: {
    bienList: [],
    activeBien: null,
    isLoadingBiens: false
  },

  getters: {
    bienFromList: (state) => (bienID) => {
      return state.bienList.find((bien) => bien.IDbien === bienID)
    }
  },

  mutations: {
    setBienList (state, biens) {
      state.bienList = biens
    },
    setActiveBien (state, bien) {
      state.activeBien = bien
    },
    setIsLoadingBiens (state, isLoading) {
      state.isLoadingBiens = isLoading
    }
  },

  actions: {
    async fetchBiens ({ rootState, commit }) {
      commit('setIsLoadingBiens', true)
      try {
        const biens = await fetchBiens(
          rootState.user.token,
          window.env.VITE_API_URL
        )
        commit('setBienList', Array.isArray(biens) ? biens : [])
      } catch (error) {
        console.error('Error fetching biens:', error)
      } finally {
        commit('setIsLoadingBiens', false)
      }
    },

    async updateBien ({ dispatch, rootState }, bien) {
      try {
        await updateBien(
          bien,
          rootState.user.token,
          window.env.VITE_API_URL
        )
        dispatch('fetchBiens')
      } catch (error) {
        console.error('Error updating bien:', error)
        throw error
      }
    },

    async deleteBien ({ dispatch, rootState }, bien) {
      try {
        await deleteBien(
          bien.IDbien,
          rootState.user.token,
          window.env.VITE_API_URL
        )
        dispatch('fetchBiens')
      } catch (error) {
        console.error('Error deleting bien:', error)
        throw error
      }
    },

    async fetchBienDetails ({ rootState, commit }, IDbien) {
      try {
        const bien = await fetchBienById(
          IDbien,
          rootState.user.token,
          window.env.VITE_API_URL
        )
        commit('setActiveBien', bien)
      } catch (error) {
        console.error('Error fetching bien details:', error)
      }
    }
  }
}
