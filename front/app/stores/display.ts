import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useDisplayStore = defineStore('display', () => {
  const account_list = ref(false)

  function toggleAccountList (force?: boolean) {
    account_list.value = typeof force === 'boolean' ? force : !account_list.value
  }

  return { account_list, toggleAccountList }
})
