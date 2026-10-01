import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchCategoryList as fetchCategoryListService } from '@/services/category'
import { API_URL } from '@/services/config'
import { useUserStore } from '@/stores/user'

export const useCategoryStore = defineStore('category', () => {
  const list = ref<any[]>([])

  const getCategoryName = computed(() => {
    return (IDcat) => {
      return list.value.find(categorie => parseInt(categorie.IDcat) === parseInt(IDcat))
    }
  })

  function setCategoryList (categories) {
    list.value = categories
  }

  function fetchCategoryList () {
    if (list.value.length < 2) {
      const user = useUserStore()
      fetchCategoryListService(user.id, user.token, API_URL)
        .then((categories) => {
          setCategoryList(categories)
        })
    }
  }

  return { list, getCategoryName, setCategoryList, fetchCategoryList }
})
