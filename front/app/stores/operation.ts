import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  deleteOperation as deleteOperationService,
  fetchOperationsForAccount,
  fetchRecurrOperation as fetchRecurrOperationService,
  fetchSearchOperations,
  updateOperation as updateOperationService,
  fetchOperations as fetchOperationsService,
  updateRecurringOperation as updateRecurringOperationService,
  deleteRecurringOperation as deleteRecurringOperationService
} from '@/services/operation'
import { API_URL } from '@/services/config'
import { useUserStore } from '@/stores/user'
import { useCompteStore } from '@/stores/compte'

export const useOperationStore = defineStore('operation', () => {
  const operationsOfActiveAccount = ref<any[] | undefined>(undefined)
  const recurringOperations = ref<any[]>([])
  const hasMoreOperations = ref(true)
  const isLoadingOperations = ref(false)
  const operationsSkip = ref(0)
  const operationsLimit = ref(35)
  const isSearchMode = ref(false)
  const currentSearchTerms = ref('')

  function operationFromCurrentList (operationID) {
    return operationsOfActiveAccount.value!.find(
      (operation) => parseInt(operationID) === operation.IDop
    )
  }

  function setOperationsOfActiveAccount (operations) {
    operationsOfActiveAccount.value = operations
  }

  function appendOperationsToActiveAccount (operations) {
    if (operationsOfActiveAccount.value === undefined) {
      operationsOfActiveAccount.value = operations
    } else {
      operationsOfActiveAccount.value = [...operationsOfActiveAccount.value, ...operations]
    }
  }

  function setRecurringOperations (operations) {
    recurringOperations.value = operations
  }

  function resetOperationsPagination () {
    operationsSkip.value = 0
    hasMoreOperations.value = true
  }

  function fetchOperationsOfActiveAccount () {
    resetOperationsPagination()
    isLoadingOperations.value = true
    isSearchMode.value = false

    fetchOperationsForAccount(
      useCompteStore().activeAccount.IDcompte,
      useUserStore().token,
      API_URL,
      0,
      operationsLimit.value
    ).then((operations) => {
      setOperationsOfActiveAccount(operations)
      operationsSkip.value = operationsLimit.value
      hasMoreOperations.value = operations.length === operationsLimit.value
      isLoadingOperations.value = false
    }).catch(() => {
      isLoadingOperations.value = false
    })
  }

  function loadMoreOperations () {
    if (!hasMoreOperations.value || isLoadingOperations.value) {
      return Promise.resolve()
    }

    isLoadingOperations.value = true

    return fetchOperationsForAccount(
      useCompteStore().activeAccount.IDcompte,
      useUserStore().token,
      API_URL,
      operationsSkip.value,
      operationsLimit.value
    ).then((operations) => {
      appendOperationsToActiveAccount(operations)
      operationsSkip.value = operationsSkip.value + operations.length
      hasMoreOperations.value = operations.length === operationsLimit.value
      isLoadingOperations.value = false
    }).catch(() => {
      isLoadingOperations.value = false
    })
  }

  async function updateOperation (operation) {
    await updateOperationService(operation, useUserStore().token, API_URL)

    useCompteStore().fetchActiveAccount(operation.IDcompte)
  }

  async function deleteOperation (operation) {
    await deleteOperationService(operation.IDop, useUserStore().token, API_URL)

    useCompteStore().fetchActiveAccount(operation.IDcompte)
  }

  async function createTransfert (operation) {
    const token = useUserStore().token
    const positiveMontant = parseFloat(
      operation.MontantOp > 0 ? operation.MontantOp : operation.MontantOp * -1
    )

    await updateOperationService(
      {
        ...operation,
        MontantOp: positiveMontant * -1,
        IDcompte: operation.IDcompteDebit
      },
      token,
      API_URL
    )

    await updateOperationService(
      {
        ...operation,
        MontantOp: positiveMontant,
        IDcompte: operation.IDcompteCredit
      },
      token,
      API_URL
    )

    useCompteStore().fetchActiveAccount(operation.IDcompteDebit)
  }

  function fetchRecurrOperation () {
    fetchRecurrOperationService(useUserStore().token, API_URL)
      .then((operations) => {
        setOperationsOfActiveAccount(operations)
        setRecurringOperations(operations)
      })
  }

  async function updateRecurringOperation (operationRecurrente) {
    await updateRecurringOperationService(
      {
        ...operationRecurrente,
        Frequence: parseInt(operationRecurrente.Frequence)
      },
      useUserStore().token,
      API_URL
    )

    fetchRecurrOperation()
  }

  async function deleteRecurringOperation (operationRecurrente) {
    await deleteRecurringOperationService(
      operationRecurrente.IDopRecu,
      useUserStore().token,
      API_URL
    )

    fetchRecurrOperation()
  }

  function getSearchOperations (searchTerms) {
    const compte = useCompteStore()
    resetOperationsPagination()
    isLoadingOperations.value = true
    isSearchMode.value = true
    currentSearchTerms.value = searchTerms

    fetchSearchOperations(
      searchTerms,
      compte.accountList,
      useUserStore().token,
      API_URL,
      0,
      operationsLimit.value
    ).then((operations) => {
      compte.setActiveAccount({ NomCompte: 'Search' })
      setOperationsOfActiveAccount(operations)
      operationsSkip.value = operationsLimit.value
      hasMoreOperations.value = operations.length === operationsLimit.value
      isLoadingOperations.value = false
    }).catch(() => {
      isLoadingOperations.value = false
    })
  }

  function loadMoreSearchOperations () {
    if (!hasMoreOperations.value || isLoadingOperations.value) {
      return Promise.resolve()
    }

    isLoadingOperations.value = true

    return fetchSearchOperations(
      currentSearchTerms.value,
      useCompteStore().accountList,
      useUserStore().token,
      API_URL,
      operationsSkip.value,
      operationsLimit.value
    ).then((operations) => {
      appendOperationsToActiveAccount(operations)
      operationsSkip.value = operationsSkip.value + operations.length
      hasMoreOperations.value = operations.length === operationsLimit.value
      isLoadingOperations.value = false
    }).catch(() => {
      isLoadingOperations.value = false
    })
  }

  function fetchOperations (where) {
    resetOperationsPagination()
    isLoadingOperations.value = true

    fetchOperationsService(where, useUserStore().token, API_URL)
      .then((operations) => {
        setOperationsOfActiveAccount(operations)
        hasMoreOperations.value = false
        isLoadingOperations.value = false
      }).catch(() => {
        isLoadingOperations.value = false
      })
  }

  return {
    operationsOfActiveAccount,
    recurringOperations,
    hasMoreOperations,
    isLoadingOperations,
    operationsSkip,
    operationsLimit,
    isSearchMode,
    currentSearchTerms,
    operationFromCurrentList,
    setOperationsOfActiveAccount,
    appendOperationsToActiveAccount,
    setRecurringOperations,
    resetOperationsPagination,
    fetchOperationsOfActiveAccount,
    loadMoreOperations,
    updateOperation,
    deleteOperation,
    createTransfert,
    fetchRecurrOperation,
    updateRecurringOperation,
    deleteRecurringOperation,
    getSearchOperations,
    loadMoreSearchOperations,
    fetchOperations
  }
})
