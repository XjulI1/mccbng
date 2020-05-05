import { fetchCategoryList } from 'mccbng_services/category'
import { initialState, getCategoryName } from 'mccbng_store/category'

export default {
  state: initialState,

  getters: {
    getCategoryName
  },

  mutations: {
    setCategoryList (state, list) {
      state.list = list
    }
  },

  actions: {
    fetchCategoryList ({ state, rootState, commit }) {
      if (state.category.list.length < 2) {
        fetchCategoryList(rootState.user.id, rootState.user.token)
          .then((categories) => {
            commit('setCategoryList', categories)
          })
      }
    }
  }
}
