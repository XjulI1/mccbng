import axios from 'axios/index'

export default {
  state: {
    list: []
  },
  getters: {
    getCategoryName (state) {
      return (IDcat) => {
        return state.list.filter((categorie) => {
          if (parseInt(categorie.IDcat) === parseInt(IDcat)) {
            return categorie
          }
        })
      }
    }
  },
  mutations: {
    setCategoryList (state, list) {
      state.list = list
    }
  },
  actions: {
    fetchCategoryList (context) {
      if (this.state.category.list.length < 5) {
        const filter = { where: { or: [{ IDuser: this.state.user.id }, { IDuser: 0 }] }, order: 'Nom ASC' }

        axios.get(process.env.VUE_APP_API_URL + '/api/Categories', {
          params: {
            access_token: context.rootState.user.token,
            filter
          }
        })
          .then((response) => {
            context.commit('setCategoryList', response.data)
          })
      }
    }
  }
}
