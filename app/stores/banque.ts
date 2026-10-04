import { ref } from 'vue'
import { defineStore } from 'pinia'
import { createBanque as createBanqueService, fetchBanques as fetchBanquesService } from '@/services/banque'
import { API_URL } from '@/services/config'
import { useUserStore } from '@/stores/user'

type Banque = { IDbanque: number; NomBanque: string }

export const useBanqueStore = defineStore('banque', () => {
  const banqueList = ref<Banque[]>([])

  function setBanqueList (list: Banque[]) {
    banqueList.value = list
  }

  function addBanque (banque: Banque) {
    banqueList.value = [...banqueList.value, banque].sort((a, b) =>
      a.NomBanque.localeCompare(b.NomBanque)
    )
  }

  function fetchBanques () {
    return fetchBanquesService(useUserStore().token, API_URL)
      .then((banques) => {
        setBanqueList(banques)
        return banques
      })
  }

  function createBanque (banque) {
    return createBanqueService(banque, useUserStore().token, API_URL)
      .then((created) => {
        addBanque(created)
        return created
      })
  }

  return { banqueList, setBanqueList, addBanque, fetchBanques, createBanque }
})
