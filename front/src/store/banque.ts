import { createBanque, fetchBanques } from '@/services/banque'

export default {
  state: {
    banqueList: [] as Array<{ IDbanque: number; NomBanque: string }>
  },

  mutations: {
    setBanqueList (state, banqueList) {
      state.banqueList = banqueList
    },

    addBanque (state, banque) {
      state.banqueList = [...state.banqueList, banque].sort((a, b) =>
        a.NomBanque.localeCompare(b.NomBanque)
      )
    }
  },

  actions: {
    fetchBanques ({ rootState, commit }) {
      const userToken = rootState.user.token
      const APIURL = window.env.VITE_API_URL

      return fetchBanques(userToken, APIURL)
        .then((banques) => {
          commit('setBanqueList', banques)
          return banques
        })
    },

    createBanque ({ rootState, commit }, banque) {
      const userToken = rootState.user.token
      const APIURL = window.env.VITE_API_URL

      return createBanque(banque, userToken, APIURL)
        .then((created) => {
          commit('addBanque', created)
          return created
        })
    }
  }
}
