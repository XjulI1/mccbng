import axios from 'axios'

export default {
  state: {
    negativeMonth: 0,
    currentMonth: (new Date()).getMonth() + 1,
    currentYear: (new Date()).getFullYear(),
    categoriesTotal: []
  },

  getters: {
    getCategoriesTotalForHighchartPie (state, getters) {
      return state.categoriesTotal.map((categorie) => {
        return {
          name: getters.getCategoryName(categorie.IDcat).Nom,
          catId: categorie.IDcat,
          y: categorie.TotalMonth * -1
        }
      })
    }
  },

  mutations: {
    setNegativeMonth (state, sum) {
      state.negativeMonth = sum
    },

    setCurrentYear (state, newYear) {
      state.currentYear = newYear
    },

    setCurrentMonth (state, newMonth) {
      state.currentMonth = newMonth
    },

    setCategoriesForMonth (state, categoriesList) {
      state.categoriesTotal = categoriesList
    }
  },

  actions: {
    fetchSumByUserByMonth (context) {
      axios.get(import.meta.env.VITE_API_URL + '/api/operations/sumByUserByMonth', {
        headers: {
          Authorization: 'Bearer ' + context.rootState.user.token
        },
        params: {
          userID: this.state.user.id,
          monthNumber: this.state.stats.currentMonth,
          yearNumber: this.state.stats.currentYear
        }
      }).then((response) => {
        context.commit('setNegativeMonth', response.data[0].MonthNegative)
      })
    },

    fetchSumCategoriesByUserByMonth (context) {
      context.dispatch('fetchCategoryList')

      axios.get(import.meta.env.VITE_API_URL + '/api/operations/sumCategoriesByUserByMonth', {
        headers: {
          Authorization: 'Bearer ' + context.rootState.user.token
        },
        params: {
          userID: this.state.user.id,
          monthNumber: this.state.stats.currentMonth,
          yearNumber: this.state.stats.currentYear
        }
      }).then((response) => {
        context.commit('setCategoriesForMonth', response.data)
      })
    },

    changeStatsCurrentYear (context, newYear) {
      context.commit('setCurrentYear', newYear)

      context.dispatch('fetchSumByUserByMonth')
      context.dispatch('fetchSumCategoriesByUserByMonth')
    },

    changeStatsCurrentMonth (context, newMonth) {
      context.commit('setCurrentMonth', newMonth)

      context.dispatch('fetchSumByUserByMonth')
      context.dispatch('fetchSumCategoriesByUserByMonth')
    }
  }
}
