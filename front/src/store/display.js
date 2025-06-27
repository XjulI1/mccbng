export default {
  state: {
    account_list: false,
    zoom_stats: false
  },

  mutations: {
    toggleAccountList (state, force) {
      state.account_list = typeof force === 'boolean' ? force : !state.account_list
    },
    toggleZoomStats (state, force) {
      state.zoom_stats = typeof force === 'boolean' ? force : !state.zoom_stats
    }
  },

  actions: {
    toggleAccountList (context, force) {
      context.commit('toggleAccountList', force)
    },
    toggleZoomStats (context, force) {
      context.commit('toggleZoomStats', force)
    }
  }
}
