import { connect } from 'react-redux'

import App from '../App'

const mapStateToProps = state => ({
  userToken: state.User.token
})

export default connect(
  mapStateToProps
)(App)
