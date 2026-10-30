import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  fetchBiens as fetchBiensService,
  fetchBienById,
  updateBien as updateBienService,
  deleteBien as deleteBienService,
  fetchBienRentabilite
} from '@/services/bien'
import { API_URL } from '@/services/config'
import { useUserStore } from '@/stores/user'
import type { BienRentabilite } from '@/utils/rentabilite'

export const useBienStore = defineStore('bien', () => {
  const bienList = ref<any[]>([])
  const activeBien = ref<any>(null)
  const bienRentabilites = ref<Record<string, BienRentabilite>>({})
  const isLoadingBiens = ref(false)
  const biensLoaded = ref(false)

  function bienFromList (bienID) {
    return bienList.value.find((bien) => bien.IDbien === bienID)
  }

  async function fetchBiens () {
    isLoadingBiens.value = true
    try {
      const biens = await fetchBiensService(useUserStore().token, API_URL)
      bienList.value = Array.isArray(biens) ? biens : []
      biensLoaded.value = true
    } catch (error) {
      console.error('Error fetching biens:', error)
    } finally {
      isLoadingBiens.value = false
    }
  }

  async function fetchBienRentabilites () {
    const token = useUserStore().token
    for (const bien of bienList.value) {
      try {
        bienRentabilites.value[bien.IDbien] = await fetchBienRentabilite(bien.IDbien, token, API_URL)
      } catch (error) {
        console.error('Error fetching rentabilite for bien:', bien.IDbien, error)
      }
    }
  }

  async function updateBien (bien) {
    try {
      await updateBienService(bien, useUserStore().token, API_URL)
      fetchBiens().then(fetchBienRentabilites)
    } catch (error) {
      console.error('Error updating bien:', error)
      throw error
    }
  }

  async function deleteBien (bien) {
    try {
      await deleteBienService(bien.IDbien, useUserStore().token, API_URL)
      fetchBiens()
    } catch (error) {
      console.error('Error deleting bien:', error)
      throw error
    }
  }

  async function fetchBienDetails (IDbien) {
    try {
      activeBien.value = await fetchBienById(IDbien, useUserStore().token, API_URL)
    } catch (error) {
      console.error('Error fetching bien details:', error)
    }
  }

  return {
    bienList,
    activeBien,
    bienRentabilites,
    isLoadingBiens,
    biensLoaded,
    bienFromList,
    fetchBiens,
    fetchBienRentabilites,
    updateBien,
    deleteBien,
    fetchBienDetails
  }
})
