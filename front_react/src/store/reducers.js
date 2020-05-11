import { combineReducers } from 'redux'

import User from './User/reducer'
import Account from './Account/reducer'
import Operation from './Operation/reducer'

export default combineReducers({
  User,
  Account,
  Operation
})
