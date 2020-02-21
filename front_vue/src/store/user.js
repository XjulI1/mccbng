import axios from 'axios/index'
import config from '@/config'

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
      return axios.get(config.API_URL + '/api/users/' + userID, {
        params: {
          access_token: context.state.token
        }
      }).then((response) => {
        context.commit('setUser', response.data)
      })
    },
    saveUserToken (context, token) {
      context.commit('setToken', token)
    }
  }
}
