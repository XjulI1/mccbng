import { combineReducers } from 'redux'

import currency from './Currency/reducer'
import user from './User/reducer'

export default combineReducers({
  Currency: currency,
  User: user
})
