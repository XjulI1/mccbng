import { combineReducers } from 'redux'

import user from './User/reducer'
import account from './Account/reducer'

export default combineReducers({
  User: user,
  Account: account
})
