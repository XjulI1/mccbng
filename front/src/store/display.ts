export default {
  state: {
    account_list: false,
  },

  mutations: {
    toggleAccountList(state, force) {
      state.account_list =
        typeof force === "boolean" ? force : !state.account_list;
    },
  },

  actions: {
    toggleAccountList(context, force) {
      context.commit("toggleAccountList", force);
    },
  },
};
