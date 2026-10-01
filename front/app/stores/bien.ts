import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  fetchBiens as fetchBiensService,
  fetchBienById,
  updateBien as updateBienService,
  deleteBien as deleteBienService
} from '@/services/bien'
import { API_URL } from '@/services/config'
import { useUserStore } from '@/stores/user'

export const useBienStore = defineStore('bien', () => {
  const bienList = ref<any[]>([])
  const activeBien = ref<any>(null)
  const isLoadingBiens = ref(false)

  function bienFromList (bienID) {
    return bienList.value.find((bien) => bien.IDbien === bienID)
  }

  async function fetchBiens () {
    isLoadingBiens.value = true
    try {
      const biens = await fetchBiensService(useUserStore().token, API_URL)
      bienList.value = Array.isArray(biens) ? biens : []
    } catch (error) {
      console.error('Error fetching biens:', error)
    } finally {
      isLoadingBiens.value = false
    }
  }

  async function updateBien (bien) {
    try {
      await updateBienService(bien, useUserStore().token, API_URL)
      fetchBiens()
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
    isLoadingBiens,
    bienFromList,
    fetchBiens,
    updateBien,
    deleteBien,
    fetchBienDetails
  }
})
