import { apiGet } from './http'

export const fetchEvolutionSolde = (userToken, APIURL) =>
  apiGet(APIURL + '/api/stats/evolutionSolde', { token: userToken })

export const fetchYearComparison = (yearA, yearB, userToken, APIURL) =>
  apiGet(APIURL + '/api/stats/yearComparison', {
    token: userToken,
    params: { yearA, yearB }
  })

export const fetchTopCategories = (from, to, limit, userToken, APIURL) =>
  apiGet(APIURL + '/api/stats/topCategories', {
    token: userToken,
    params: { from, to, limit }
  })

export const fetchIncomeVsExpense = (yearNumber, userToken, APIURL) =>
  apiGet(APIURL + '/api/stats/incomeVsExpense', {
    token: userToken,
    params: { yearNumber }
  })

export const fetchTopOperations = (from, to, limit, userToken, APIURL) =>
  apiGet(APIURL + '/api/stats/topOperations', {
    token: userToken,
    params: { from, to, limit }
  })

export const fetchCategoryHeatmap = (yearNumber, userToken, APIURL) =>
  apiGet(APIURL + '/api/stats/categoryHeatmap', {
    token: userToken,
    params: { yearNumber }
  })

export default {
  fetchEvolutionSolde,
  fetchYearComparison,
  fetchTopCategories,
  fetchIncomeVsExpense,
  fetchTopOperations,
  fetchCategoryHeatmap
}
