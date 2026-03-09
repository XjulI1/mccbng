import {
  getConfigStatus,
  listRequisitions,
  listLinkedAccounts,
  createRequisition,
  getRequisitionStatus,
  deleteRequisition,
  linkAccount,
  unlinkAccount,
  syncTransactions
} from '@/services/gocardless'

export default {
  state: {
    configured: false,
    requisitions: [],
    linkedAccounts: [],
    syncInProgress: {},
    lastSyncResult: null
  },

  getters: {
    isAccountLinked: ({ linkedAccounts }) => {
      return (IDcompte) => {
        return linkedAccounts.some((a) => a.IDcompte === IDcompte)
      }
    },

    getLinkedAccount: ({ linkedAccounts }) => {
      return (IDcompte) => {
        return linkedAccounts.find((a) => a.IDcompte === IDcompte)
      }
    },

    isSyncing: ({ syncInProgress }) => {
      return (IDcompte) => {
        return !!syncInProgress[IDcompte]
      }
    }
  },

  mutations: {
    setGocardlessConfigured(state, configured) {
      state.configured = configured
    },

    setRequisitions(state, requisitions) {
      state.requisitions = requisitions
    },

    setLinkedAccounts(state, accounts) {
      state.linkedAccounts = accounts
    },

    setSyncInProgress(state, { IDcompte, inProgress }) {
      state.syncInProgress = { ...state.syncInProgress, [IDcompte]: inProgress }
    },

    setLastSyncResult(state, result) {
      state.lastSyncResult = result
    }
  },

  actions: {
    async fetchGocardlessStatus({ commit, rootState }) {
      try {
        const status = await getConfigStatus(rootState.user.token, window.env.VITE_API_URL)
        commit('setGocardlessConfigured', status.configured)
      } catch {
        commit('setGocardlessConfigured', false)
      }
    },

    async fetchRequisitions({ commit, rootState }) {
      const requisitions = await listRequisitions(
        rootState.user.token,
        window.env.VITE_API_URL
      )
      commit('setRequisitions', requisitions)
    },

    async fetchLinkedAccounts({ commit, rootState }) {
      const accounts = await listLinkedAccounts(
        rootState.user.token,
        window.env.VITE_API_URL
      )
      commit('setLinkedAccounts', accounts)
    },

    async createBankRequisition({ rootState }, { institutionId, redirectUrl }) {
      return createRequisition(
        institutionId,
        redirectUrl,
        rootState.user.token,
        window.env.VITE_API_URL
      )
    },

    async checkRequisitionStatus({ rootState }, requisitionId) {
      return getRequisitionStatus(
        requisitionId,
        rootState.user.token,
        window.env.VITE_API_URL
      )
    },

    async removeRequisition({ dispatch, rootState }, requisitionId) {
      await deleteRequisition(
        requisitionId,
        rootState.user.token,
        window.env.VITE_API_URL
      )
      await dispatch('fetchRequisitions')
      await dispatch('fetchLinkedAccounts')
    },

    async linkGocardlessAccount(
      { dispatch, rootState },
      { accountId, IDcompte, requisitionId, iban, institutionId }
    ) {
      await linkAccount(
        accountId,
        IDcompte,
        requisitionId,
        iban,
        institutionId,
        rootState.user.token,
        window.env.VITE_API_URL
      )
      await dispatch('fetchLinkedAccounts')
    },

    async unlinkGocardlessAccount({ dispatch, rootState }, id) {
      await unlinkAccount(id, rootState.user.token, window.env.VITE_API_URL)
      await dispatch('fetchLinkedAccounts')
    },

    async syncAccountTransactions({ commit, dispatch, rootState }, IDcompte) {
      commit('setSyncInProgress', { IDcompte, inProgress: true })
      try {
        const result = await syncTransactions(
          IDcompte,
          rootState.user.token,
          window.env.VITE_API_URL
        )
        commit('setLastSyncResult', { IDcompte, ...result })

        // Refresh operations and balances after sync
        dispatch('fetchActiveAccount', IDcompte)

        return result
      } finally {
        commit('setSyncInProgress', { IDcompte, inProgress: false })
      }
    }
  }
}
