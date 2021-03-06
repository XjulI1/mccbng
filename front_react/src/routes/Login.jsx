import React from 'react'

import Authentification from '../components/Authentification'

import 'mccbng_styles/routes/Login.scss'

class Login extends React.Component {
  render () {
    return <div className="login-page">
      <h2>Authentification</h2>

      <h4>Tapez votre code d'accès</h4>

      <Authentification goBackUrl={this.props.location.state ? this.props.location.state.referrer : '/'}/>
    </div>
  }
}

export default Login
