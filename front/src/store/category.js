import { fetchCategoryList } from '@/services/category'

export default {
  state: {
    list: []
  },

  getters: {
    getCategoryName({ list }) {
      return (IDcat) => {
        return list.find(categorie => parseInt(categorie.IDcat) === parseInt(IDcat))
      }
    }
  },

  mutations: {
    setCategoryList(state, list) {
      state.list = list
    }
  },

  actions: {
    fetchCategoryList({ state, rootState, commit }) {
      if (state.list.length < 2) {
        fetchCategoryList(rootState.user.id, rootState.user.token, process.env.VUE_APP_API_URL)
          .then((categories) => {
            commit('setCategoryList', categories)
          })
      }
    }
  }
}
