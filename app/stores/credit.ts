import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  fetchCredits as fetchCreditsService,
  fetchCreditById,
  updateCredit as updateCreditService,
  deleteCredit as deleteCreditService,
  fetchCreditRemainingBalance
} from '@/services/credit'
import { API_URL } from '@/services/config'
import { useUserStore } from '@/stores/user'

export const useCreditStore = defineStore('credit', () => {
  const creditList = ref<any[]>([])
  const activeCredit = ref<any>(null)
  const creditBalances = ref<Record<string, any>>({})
  const isLoadingCredits = ref(false)

  function creditFromList (creditID) {
    return creditList.value.find((credit) => credit.IDcredit === creditID)
  }

  function setCreditBalance ({ IDcredit, balance }) {
    creditBalances.value[IDcredit] = balance
  }

  async function fetchCredits () {
    const token = useUserStore().token
    isLoadingCredits.value = true
    try {
      const credits = await fetchCreditsService(token, API_URL)
      creditList.value = Array.isArray(credits) ? credits : []

      // Fetch balances for all credits
      for (const credit of (Array.isArray(credits) ? credits : [])) {
        try {
          const balance = await fetchCreditRemainingBalance(credit.IDcredit, token, API_URL)
          setCreditBalance({ IDcredit: credit.IDcredit, balance })
        } catch (error) {
          console.error('Error fetching balance for credit:', credit.IDcredit, error)
        }
      }
    } catch (error) {
      console.error('Error fetching credits:', error)
    } finally {
      isLoadingCredits.value = false
    }
  }

  async function updateCredit (credit) {
    try {
      await updateCreditService(credit, useUserStore().token, API_URL)
      // Refresh credits list
      fetchCredits()
    } catch (error) {
      console.error('Error updating credit:', error)
      throw error
    }
  }

  async function deleteCredit (credit) {
    try {
      await deleteCreditService(credit.IDcredit, useUserStore().token, API_URL)
      // Refresh credits list
      fetchCredits()
    } catch (error) {
      console.error('Error deleting credit:', error)
      throw error
    }
  }

  async function fetchCreditDetails (IDcredit) {
    const token = useUserStore().token
    try {
      activeCredit.value = await fetchCreditById(IDcredit, token, API_URL)

      const balance = await fetchCreditRemainingBalance(IDcredit, token, API_URL)
      setCreditBalance({ IDcredit, balance })
    } catch (error) {
      console.error('Error fetching credit details:', error)
    }
  }

  return {
    creditList,
    activeCredit,
    creditBalances,
    isLoadingCredits,
    creditFromList,
    setCreditBalance,
    fetchCredits,
    updateCredit,
    deleteCredit,
    fetchCreditDetails
  }
})
