import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { generateRecurringOperations as generateRecurringOperationsService } from '@/services/operation'
import {
  createCompte as createCompteService,
  deleteCompte as deleteCompteService,
  fetchAccountList as fetchAccountListService,
  fetchComptesManagementInfo as fetchComptesManagementInfoService,
  sumAllCompteForUser,
  sumForACompte,
  updateCompte as updateCompteService
} from '@/services/compte'
import { API_URL } from '@/services/config'
import { useUserStore } from '@/stores/user'
import { useOperationStore } from '@/stores/operation'

// Utility functions for mutations and actions

const calcActiveAccountBalances = (activeAccount, { TotalChecked, TotalNotChecked }) => {
  TotalChecked = parseFloat(TotalChecked || 0)
  TotalNotChecked = parseFloat(TotalNotChecked || 0)

  return {
    ...activeAccount,
    soldeChecked: Math.round(TotalChecked * 100) / 100,
    soldeNotChecked: Math.round((TotalChecked + TotalNotChecked) * 100) / 100
  }
}

const setSumAllAccountForUser = (accountList, sumList) => {
  return accountList.map((account) => {
    const sum = sumList.filter(sum => sum.IDCompte === account.IDcompte)

    if (sum[0]) {
      account = calcActiveAccountBalances(account, {
        TotalChecked: sum[0].TotalChecked,
        TotalNotChecked: sum[0].TotalNotChecked
      })
    }

    return account
  })
}

const updateSoldeInAccountList = (accountList, IDcompte, solde) => {
  return accountList.map((account) => {
    if (account.IDcompte === IDcompte) {
      account.soldeNotChecked = solde
    }
    return account
  })
}

export const useCompteStore = defineStore('compte', () => {
  const activeAccount = ref<any>({})
  const accountList = ref<any[]>([])
  const currency = ref('€')
  const managementInfo = ref<Array<{ IDcompte: number; lastOpDate: string | null; hasReferences: boolean }>>([])

  const sumSoldes = (accounts) => accounts.reduce((acc, account) => {
    acc += account.soldeNotChecked
    return Math.round(acc * 100) / 100
  }, 0)

  const visibleAccounts = computed(() => accountList.value.filter(account => account.visible))

  const bloquedCompte = computed(() => visibleAccounts.value.filter(
    account => account.bloque && !account.retraite && !account.joint && !account.children
  ))

  const retraiteCompte = computed(() => visibleAccounts.value.filter(account => account.retraite))

  const availableCompte = computed(() => visibleAccounts.value.filter(
    account => !account.bloque && !account.porte_feuille
  ))

  const porteFeuilleCompte = computed(() => visibleAccounts.value.filter(account => account.porte_feuille))

  const jointCompte = computed(() => visibleAccounts.value.filter(account => account.joint))

  const childrenCompte = computed(() => visibleAccounts.value.filter(account => account.children))

  const totalAvailable = computed(() => sumSoldes(availableCompte.value.concat(porteFeuilleCompte.value)))

  const totalGlobal = computed(() => {
    return bloquedCompte.value.concat(jointCompte.value).reduce((acc, account: any) => {
      acc += account.soldeNotChecked
      return Math.round(acc * 100) / 100
    }, totalAvailable.value)
  })

  const totalRetraite = computed(() => sumSoldes(retraiteCompte.value))

  const totalJoint = computed(() => sumSoldes(jointCompte.value))

  const totalChildren = computed(() => sumSoldes(childrenCompte.value))

  const getAccount = computed(() => {
    return (IDcompte) => {
      return accountList.value.find(account => account.IDcompte === parseInt(IDcompte))
    }
  })

  function setActiveAccount (account) {
    activeAccount.value = account
  }

  function setNewBalances ({ TotalChecked, TotalNotChecked }) {
    activeAccount.value = calcActiveAccountBalances(activeAccount.value, { TotalChecked, TotalNotChecked })
    accountList.value = updateSoldeInAccountList(accountList.value, activeAccount.value.IDcompte, activeAccount.value.soldeNotChecked)
  }

  function setAccountList (list) {
    accountList.value = list
  }

  function setSumAllCompteForUser (sumList) {
    accountList.value = setSumAllAccountForUser(accountList.value, sumList)
  }

  function setComptesManagementInfo (info) {
    managementInfo.value = info
  }

  async function fetchUserByIDAndGenerateRecurringOp (userID) {
    await useUserStore().fetchUser(userID)

    generateRecurringOperations()
  }

  function generateRecurringOperations () {
    generateRecurringOperationsService(useUserStore().token, API_URL)
  }

  function fetchActiveAccount (accountID) {
    const user = useUserStore()
    setActiveAccount(getAccount.value(accountID))

    useOperationStore().fetchOperationsOfActiveAccount()

    sumForACompte(user.token, accountID, API_URL)
      .then(({ TotalChecked, TotalNotChecked }) => {
        setNewBalances({ TotalChecked, TotalNotChecked })
      })
  }

  function fetchAccountList () {
    const user = useUserStore()

    return fetchAccountListService(user.id, user.token, API_URL)
      .then((list) => {
        setAccountList(list)

        return sumAllCompteForUser(user.token, API_URL)
      })
      .then((sumList) => {
        setSumAllCompteForUser(sumList)
      })
  }

  function fetchComptesManagementInfo () {
    return fetchComptesManagementInfoService(useUserStore().token, API_URL)
      .then((info) => {
        setComptesManagementInfo(info)
        return info
      })
  }

  function createCompte (compte) {
    const payload = { ...compte, solde: 0 }
    delete payload.IDcompte

    return createCompteService(payload, useUserStore().token, API_URL)
      .then((created) => {
        fetchAccountList()
        return created
      })
  }

  function updateCompte (compte) {
    const { IDcompte, ...rest } = compte
    const payload = { ...rest }
    delete payload.solde
    delete payload.banque

    return updateCompteService(IDcompte, payload, useUserStore().token, API_URL)
      .then(() => {
        fetchAccountList()
      })
  }

  function deleteCompte (compte) {
    return deleteCompteService(compte.IDcompte, useUserStore().token, API_URL)
      .then(() => {
        fetchAccountList()
      })
  }

  return {
    activeAccount,
    accountList,
    currency,
    managementInfo,
    visibleAccounts,
    bloquedCompte,
    retraiteCompte,
    availableCompte,
    porteFeuilleCompte,
    jointCompte,
    childrenCompte,
    totalAvailable,
    totalGlobal,
    totalRetraite,
    totalJoint,
    totalChildren,
    getAccount,
    setActiveAccount,
    setNewBalances,
    setAccountList,
    setSumAllCompteForUser,
    setComptesManagementInfo,
    fetchUserByIDAndGenerateRecurringOp,
    generateRecurringOperations,
    fetchActiveAccount,
    fetchAccountList,
    fetchComptesManagementInfo,
    createCompte,
    updateCompte,
    deleteCompte
  }
})
