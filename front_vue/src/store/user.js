import { fetchUser } from 'mccbng_services/user'
import { initialState } from 'mccbng_store/user'

export default {
  state: initialState,

  mutations: {
    setUser (state, { id, favoris, warningTotal }) {
      state.id = id
      state.favoris = favoris
      state.warningTotal = warningTotal
    },

    setToken (state, token) {
      state.token = token
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
    }
  }
}
