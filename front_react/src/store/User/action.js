export const SAVE_USER_TOKEN = 'SAVE_USER_TOKEN'
export const SAVE_USER_INFOS = 'SAVE_USER_INFOS'

export function saveUserToken (token) {
  return { type: SAVE_USER_TOKEN, token }
}

export function saveUserInformations (userInfos) {
  return { type: SAVE_USER_INFOS, userInfos }
}
