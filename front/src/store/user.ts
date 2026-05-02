import { fetchUser, updateUser } from '@/services/user'

export default {
  state: {
    id: null,
    favoris: null,
    warningTotal: null,
    warningCompte: null,
    email: null,
    username: null,
    token: null,
    maskAmount: false
  },

  mutations: {
    setUser (state, { id, favoris, warningTotal, warningCompte, email, username }) {
      state.id = id
      state.favoris = favoris
      state.warningTotal = warningTotal
      state.warningCompte = warningCompte
      state.email = email
      state.username = username
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
      return fetchUser(userID, state.token, window.env.VITE_API_URL)
        .then((response) => {
          commit('setUser', response)
        })
    },

    updateUser ({ state, dispatch }, updates) {
      return updateUser(updates, state.token, window.env.VITE_API_URL)
        .then(() => dispatch('fetchUser', state.id))
    },

    saveUserToken ({ commit }, token) {
      commit('setToken', token)
    },

    toggleMaskAmount ({ commit }) {
      commit('toggleMaskAmount')
    }
  }
}
