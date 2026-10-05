import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchUser as fetchUserService, updateUser as updateUserService } from '@/services/user'
import { API_URL } from '@/services/config'

export const useUserStore = defineStore('user', () => {
  const id = ref<any>(null)
  const favoris = ref<any>(null)
  const warningTotal = ref<any>(null)
  const warningCompte = ref<any>(null)
  const email = ref<any>(null)
  const username = ref<any>(null)
  // Marqueur de session ouverte (et non un JWT : le jeton est dans le cookie HttpOnly mccbngAuth, illisible en JS).
  // Conservé sous ce nom car les services le reçoivent encore en paramètre (ignoré par le client HTTP).
  const token = ref<true | null>(null)
  const maskAmount = ref(false)

  function setUser (user) {
    id.value = user.id
    favoris.value = user.favoris
    warningTotal.value = user.warningTotal
    warningCompte.value = user.warningCompte
    email.value = user.email
    username.value = user.username
  }

  function fetchUser (userID) {
    return fetchUserService(userID, token.value, API_URL)
      .then((response) => {
        setUser(response)
      })
  }

  function updateUser (updates) {
    return updateUserService(updates, token.value, API_URL)
      .then(() => fetchUser(id.value))
  }

  function openSession () {
    token.value = true
  }

  function closeSession () {
    token.value = null
  }

  function toggleMaskAmount () {
    maskAmount.value = !maskAmount.value
  }

  return {
    id,
    favoris,
    warningTotal,
    warningCompte,
    email,
    username,
    token,
    maskAmount,
    setUser,
    fetchUser,
    updateUser,
    openSession,
    closeSession,
    toggleMaskAmount
  }
})
