import { fetchUser } from 'mccbng_services/user'

export default {
  state: {
    id: undefined,
    favoris: undefined,
    warningTotal: undefined,
    token: undefined
  },
  getters: {
    userID (state) {
      return state.id
    }
  },
  mutations: {
    setUser (state, user) {
      state.id = user.id
      state.favoris = user.favoris
      state.warningTotal = user.warningTotal
    },
    setToken (state, token) {
      state.token = token
    }
  },
  actions: {
    fetchUser (context, userID) {
      return fetchUser(userID, context.state.token, process.env.VUE_APP_API_URL)
        .then((response) => {
          context.commit('setUser', response)
        })
    },
    saveUserToken (context, token) {
      context.commit('setToken', token)
    }
  }
}
