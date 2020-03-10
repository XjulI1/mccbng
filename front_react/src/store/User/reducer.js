import { SAVE_USER_TOKEN, SAVE_USER_INFOS } from './action'
import { initialState } from 'mccbng_store/user'

const saveUserToken = function (state, token) {
  return { ...state, ...{ token: token } }
}

const saveUserInfos = function (state, userInfos) {
  return {
    ...state,
    ...userInfos
  }
}

export default function (state = initialState, action) {
  switch (action.type) {
    case SAVE_USER_TOKEN:
      return saveUserToken(state, action.token)
    case SAVE_USER_INFOS:
      return saveUserInfos(state, action.userInfos)
    default:
      return state
  }
}
