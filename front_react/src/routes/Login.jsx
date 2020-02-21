import React from 'react'

import Authentification from '../containers/Authentification'

import './styles/Login.scss'

class Login extends React.Component {
  render () {
    return <div className="login-page">
      <h2>Authentification</h2>

      <h4>Tapez votre code d'accès</h4>

      <Authentification/>
    </div>
  }
}

export default Login
