import { fetchCategoryList } from '@/services/category'
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
      if (state.list.length < 2) {
        fetchCategoryList(rootState.user.id, rootState.user.token, process.env.VUE_APP_API_URL)
          .then((categories) => {
            commit('setCategoryList', categories)
          })
      }
    }
  }
}
