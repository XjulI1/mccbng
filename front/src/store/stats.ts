import axios from 'axios'
import {
  fetchYearComparison,
  fetchTopCategories,
  fetchIncomeVsExpense,
  fetchTopOperations,
  fetchCategoryHeatmap
} from '@/services/stats'

const today = new Date()
const startOfYear = new Date(today.getFullYear(), 0, 1)

const toISODate = (date) => date.toISOString().slice(0, 10)

export default {
  state: {
    negativeMonth: 0,
    currentMonth: today.getMonth() + 1,
    currentYear: today.getFullYear(),
    categoriesTotal: [],

    comparisonYearA: today.getFullYear() - 1,
    comparisonYearB: today.getFullYear(),
    yearComparison: { yearA: [], yearB: [], deltaPct: [] },

    periodFrom: toISODate(startOfYear),
    periodTo: toISODate(today),
    topLimit: 10,

    topCategories: [],
    incomeVsExpense: { income: [], expense: [] },
    topOperations: [],

    heatmapYear: today.getFullYear(),
    categoryHeatmap: { categories: [], data: [] }
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
    },

    getSavingsRate (state) {
      const { income, expense } = state.incomeVsExpense
      if (!income || income.length === 0) return []
      return income.map((inc, i) => {
        if (!inc) return null
        const exp = Math.abs(expense[i] ?? 0)
        return Math.round(((inc - exp) / inc) * 10000) / 100
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
    },

    setComparisonYearA (state, year) {
      state.comparisonYearA = year
    },
    setComparisonYearB (state, year) {
      state.comparisonYearB = year
    },
    setYearComparison (state, payload) {
      state.yearComparison = payload
    },

    setPeriodFrom (state, value) {
      state.periodFrom = value
    },
    setPeriodTo (state, value) {
      state.periodTo = value
    },
    setTopLimit (state, value) {
      state.topLimit = value
    },

    setTopCategories (state, list) {
      state.topCategories = list
    },
    setIncomeVsExpense (state, payload) {
      state.incomeVsExpense = payload
    },
    setTopOperations (state, list) {
      state.topOperations = list
    },

    setHeatmapYear (state, year) {
      state.heatmapYear = year
    },
    setCategoryHeatmap (state, payload) {
      state.categoryHeatmap = payload
    }
  },

  actions: {
    fetchSumByUserByMonth ({ state, commit, rootState }) {
      axios.get(window.env.VITE_API_URL + '/api/operations/sumByUserByMonth', {
        headers: {
          Authorization: 'Bearer ' + rootState.user.token
        },
        params: {
          monthNumber: state.currentMonth,
          yearNumber: state.currentYear
        }
      }).then((response) => {
        commit('setNegativeMonth', response.data[0].MonthNegative)
      })
    },

    fetchSumCategoriesByUserByMonth ({ dispatch, commit, state, rootState }) {
      dispatch('fetchCategoryList')

      axios.get(window.env.VITE_API_URL + '/api/operations/sumCategoriesByUserByMonth', {
        headers: {
          Authorization: 'Bearer ' + rootState.user.token
        },
        params: {
          monthNumber: state.currentMonth,
          yearNumber: state.currentYear
        }
      }).then((response) => {
        commit('setCategoriesForMonth', response.data)
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
    },

    fetchYearComparison ({ commit, state, rootState }) {
      return fetchYearComparison(
        state.comparisonYearA,
        state.comparisonYearB,
        rootState.user.token,
        window.env.VITE_API_URL
      ).then((data) => commit('setYearComparison', data))
    },

    changeComparisonYearA ({ commit, dispatch }, year) {
      commit('setComparisonYearA', year)
      return dispatch('fetchYearComparison')
    },

    changeComparisonYearB ({ commit, dispatch }, year) {
      commit('setComparisonYearB', year)
      return dispatch('fetchYearComparison')
    },

    fetchTopCategories ({ commit, dispatch, state, rootState }) {
      dispatch('fetchCategoryList')
      return fetchTopCategories(
        state.periodFrom,
        state.periodTo,
        state.topLimit,
        rootState.user.token,
        window.env.VITE_API_URL
      ).then((data) => commit('setTopCategories', data))
    },

    fetchIncomeVsExpense ({ commit, state, rootState }) {
      return fetchIncomeVsExpense(
        state.currentYear,
        rootState.user.token,
        window.env.VITE_API_URL
      ).then((data) => commit('setIncomeVsExpense', data))
    },

    fetchTopOperations ({ commit, state, rootState }) {
      return fetchTopOperations(
        state.periodFrom,
        state.periodTo,
        state.topLimit,
        rootState.user.token,
        window.env.VITE_API_URL
      ).then((data) => commit('setTopOperations', data))
    },

    changePeriod ({ commit, dispatch }, { from, to }) {
      commit('setPeriodFrom', from)
      commit('setPeriodTo', to)
      dispatch('fetchTopCategories')
      dispatch('fetchTopOperations')
    },

    fetchCategoryHeatmap ({ commit, dispatch, state, rootState }) {
      dispatch('fetchCategoryList')
      return fetchCategoryHeatmap(
        state.heatmapYear,
        rootState.user.token,
        window.env.VITE_API_URL
      ).then((data) => commit('setCategoryHeatmap', data))
    },

    changeHeatmapYear ({ commit, dispatch }, year) {
      commit('setHeatmapYear', year)
      return dispatch('fetchCategoryHeatmap')
    }
  }
}
