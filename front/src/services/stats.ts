import axios from 'axios'

export const fetchEvolutionSolde = (userToken, APIURL) => {
  return axios.get(APIURL + '/api/stats/evolutionSolde', {
    headers: {
      Authorization: 'Bearer ' + userToken
    }
  }).then((response) => {
    return response.data
  })
}

export const fetchYearComparison = (yearA, yearB, userToken, APIURL) => {
  return axios.get(APIURL + '/api/stats/yearComparison', {
    headers: { Authorization: 'Bearer ' + userToken },
    params: { yearA, yearB }
  }).then((response) => response.data)
}

export const fetchTopCategories = (from, to, limit, userToken, APIURL) => {
  return axios.get(APIURL + '/api/stats/topCategories', {
    headers: { Authorization: 'Bearer ' + userToken },
    params: { from, to, limit }
  }).then((response) => response.data)
}

export const fetchIncomeVsExpense = (yearNumber, userToken, APIURL) => {
  return axios.get(APIURL + '/api/stats/incomeVsExpense', {
    headers: { Authorization: 'Bearer ' + userToken },
    params: { yearNumber }
  }).then((response) => response.data)
}

export const fetchTopOperations = (from, to, limit, userToken, APIURL) => {
  return axios.get(APIURL + '/api/stats/topOperations', {
    headers: { Authorization: 'Bearer ' + userToken },
    params: { from, to, limit }
  }).then((response) => response.data)
}

export const fetchCategoryHeatmap = (yearNumber, userToken, APIURL) => {
  return axios.get(APIURL + '/api/stats/categoryHeatmap', {
    headers: { Authorization: 'Bearer ' + userToken },
    params: { yearNumber }
  }).then((response) => response.data)
}

export default {
  fetchEvolutionSolde,
  fetchYearComparison,
  fetchTopCategories,
  fetchIncomeVsExpense,
  fetchTopOperations,
  fetchCategoryHeatmap
}
