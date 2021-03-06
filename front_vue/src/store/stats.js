import axios from 'axios/index'

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
      axios.get(process.env.VUE_APP_API_URL + '/api/Operations/sumByUserByMonth', {
        params: {
          access_token: context.rootState.user.token,
          userID: this.state.user.id,
          monthNumber: this.state.stats.currentMonth,
          yearNumber: this.state.stats.currentYear
        }
      }).then((response) => {
        context.commit('setNegativeMonth', response.data.results[0].MonthNegative)
      })
    },

    fetchSumCategoriesByUserByMonth (context) {
      context.dispatch('fetchCategoryList')

      axios.get(process.env.VUE_APP_API_URL + '/api/Operations/sumCategoriesByUserByMonth', {
        params: {
          access_token: context.rootState.user.token,
          userID: this.state.user.id,
          monthNumber: this.state.stats.currentMonth,
          yearNumber: this.state.stats.currentYear
        }
      }).then((response) => {
        context.commit('setCategoriesForMonth', response.data.results)
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
