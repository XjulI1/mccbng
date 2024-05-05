import { fetchUser } from '@/services/user'

export default {
  state: {
    id: null,
    favoris: null,
    warningTotal: null,
    token: null,
    maskAmount: false
  },

  mutations: {
    setUser (state, { id, favoris, warningTotal }) {
      state.id = id
      state.favoris = favoris
      state.warningTotal = warningTotal
    },

    setToken (state, token) {
      state.token = token
    },

    toggleMaskAmount (state) {
      state.maskAmount = !state.maskAmount
    }
  },

  actions: {
    fetchUser ({ state, commit }, userID) {
      return fetchUser(userID, state.token, process.env.VUE_APP_API_URL)
        .then((response) => {
          commit('setUser', response)
        })
    },

    saveUserToken ({ commit }, token) {
      commit('setToken', token)
    },

    toggleMaskAmount ({ commit }) {
      commit('toggleMaskAmount')
    }
  }
}
