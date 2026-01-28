import { createStore } from 'vuex'

import User from './user'
import Category from './category'
import Operation from './operation'
import Dispay from './display'
import Stats from './stats'
import Compte from './compte'
import Credit from './credit'

export default createStore({
  modules: {
    user: User,
    category: Category,
    operation: Operation,
    display: Dispay,
    stats: Stats,
    compte: Compte,
    credit: Credit
  }
})
