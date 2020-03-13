import Vue from 'vue'
import Vuex from 'vuex'

import User from './user'
import Category from './category'
import Operation from './operation'
import Dispay from './display'
import Stats from './stats'
import Compte from './compte'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    user: User,
    category: Category,
    operation: Operation,
    display: Dispay,
    stats: Stats,
    compte: Compte
  }
})
