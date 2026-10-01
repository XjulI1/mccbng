import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { apiGet } from '@/services/http'
import { API_URL } from '@/services/config'
import { useUserStore } from '@/stores/user'
import { useCategoryStore } from '@/stores/category'

export const useStatsStore = defineStore('stats', () => {
  const negativeMonth = ref(0)
  const currentMonth = ref(new Date().getMonth() + 1)
  const currentYear = ref(new Date().getFullYear())
  const categoriesTotal = ref<any[]>([])

  const getCategoriesTotalForHighchartPie = computed(() => {
    const category = useCategoryStore()
    return categoriesTotal.value.map((categorie) => {
      return {
        name: category.getCategoryName(categorie.IDcat).Nom,
        catId: categorie.IDcat,
        y: categorie.TotalMonth * -1
      }
    })
  })

  function fetchSumByUserByMonth () {
    apiGet<Array<{ MonthNegative: number }>>(
      API_URL + '/api/operations/sumByUserByMonth',
      {
        token: useUserStore().token,
        params: {
          monthNumber: currentMonth.value,
          yearNumber: currentYear.value
        }
      }
    ).then((data) => {
      negativeMonth.value = data[0].MonthNegative
    })
  }

  function fetchSumCategoriesByUserByMonth () {
    useCategoryStore().fetchCategoryList()

    apiGet(
      API_URL + '/api/operations/sumCategoriesByUserByMonth',
      {
        token: useUserStore().token,
        params: {
          monthNumber: currentMonth.value,
          yearNumber: currentYear.value
        }
      }
    ).then((data) => {
      categoriesTotal.value = data as any[]
    })
  }

  function changeStatsCurrentYear (newYear) {
    currentYear.value = newYear

    fetchSumByUserByMonth()
    fetchSumCategoriesByUserByMonth()
  }

  function changeStatsCurrentMonth (newMonth) {
    currentMonth.value = newMonth

    fetchSumByUserByMonth()
    fetchSumCategoriesByUserByMonth()
  }

  return {
    negativeMonth,
    currentMonth,
    currentYear,
    categoriesTotal,
    getCategoriesTotalForHighchartPie,
    fetchSumByUserByMonth,
    fetchSumCategoriesByUserByMonth,
    changeStatsCurrentYear,
    changeStatsCurrentMonth
  }
})
