import { apiGet } from '@/services/http'

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
    fetchSumByUserByMonth ({ state, commit, rootState }) {
      apiGet<Array<{ MonthNegative: number }>>(
        window.env.VITE_API_URL + '/api/operations/sumByUserByMonth',
        {
          token: rootState.user.token,
          params: {
            monthNumber: state.currentMonth,
            yearNumber: state.currentYear
          }
        }
      ).then((data) => {
        commit('setNegativeMonth', data[0].MonthNegative)
      })
    },

    fetchSumCategoriesByUserByMonth ({ dispatch, commit, state, rootState }) {
      dispatch('fetchCategoryList')

      apiGet(
        window.env.VITE_API_URL + '/api/operations/sumCategoriesByUserByMonth',
        {
          token: rootState.user.token,
          params: {
            monthNumber: state.currentMonth,
            yearNumber: state.currentYear
          }
        }
      ).then((data) => {
        commit('setCategoriesForMonth', data)
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
