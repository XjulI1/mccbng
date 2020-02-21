import { connect } from 'react-redux'
import { saveUserToken, saveUserInformations } from '../store/User/action'

import Authentification from '../components/Authentification'

const mapStateToProps = state => ({
  userToken: state.User.token
})

const mapDispatchToProps = dispatch => {
  return {
    saveUserToken: token => {
      dispatch(saveUserToken(token))
    },
    saveUserInfos: userInfos => {
      dispatch(saveUserInformations(userInfos))
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Authentification)
