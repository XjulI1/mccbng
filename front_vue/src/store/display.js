export default {
  state: {
    account_list: false,
    categories_drop_zone: false,
    actual_drag_cat: undefined
  },
  getters: {},
  mutations: {
    toggleAccountList (state, force) {
      state.account_list = force || !state.account_list
    },

    toggleCategoriesDropZone (state) {
      state.categories_drop_zone = !state.categories_drop_zone
    },

    setActualDragCategory (state, IDcat) {
      state.actual_drag_cat = parseInt(IDcat)
    }
  },
  actions: {
    toggleAccountList (context, force) {
      context.commit('toggleAccountList', force)
    },

    toggleCategoriesDropZone (context) {
      context.commit('toggleCategoriesDropZone')
    },

    actualDragCategory (context, IDcat) {
      context.commit('setActualDragCategory', IDcat)
    }
  }
}
