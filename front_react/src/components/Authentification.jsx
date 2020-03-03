import React from 'react'
import PropTypes from 'prop-types'
import { Redirect } from 'react-router-dom'
import { connect } from 'react-redux'

import { saveUserToken, saveUserInformations } from '../store/User/action'
import { getTokenCookie, getUserIDCookie, auth, saveCookies, checkUserAuthentification } from 'mccbng_services/auth'
import { fetchUser } from 'mccbng_services/user'

import './styles/Authentification.scss'

class Authentification extends React.Component {
  static propTypes = {
    userToken: PropTypes.string,
    saveUserToken: PropTypes.func.isRequired,
    saveUserInfos: PropTypes.func.isRequired
  }

  constructor (props) {
    super(props)

    this.state = {
      buttonList: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => {
        return 0.5 - Math.random()
      }),
      code: '',
      autoAuthProgress: true
    }
  }

  addCodeValue = event => {
    this.setState({ code: this.state.code + event.target.value })
  }

  resetCode = () => {
    this.setState({ code: '' })
  }

  authentification = code => {
    auth(code, process.env.REACT_APP_API_URL)
      .then(async (authValues) => {
        saveCookies(authValues)

        this.userInformations(authValues.userToken)
      })
      .catch(() => {
        this.setState({ autoAuthProgress: false })
        this.resetCode()
      })
  }

  userInformations = async (userToken) => {
    this.props.saveUserInfos(await fetchUser(getUserIDCookie(), userToken))
    this.props.saveUserToken(userToken)
  }

  async componentDidMount () {
    const token = getTokenCookie()

    if (token !== undefined) {
      const isConnected = await checkUserAuthentification({
        userToken: token,
        userID: getUserIDCookie(),
        api_url: process.env.REACT_APP_API_URL
      })

      if (isConnected) {
        this.userInformations(token)
      } else {
        this.setState({ autoAuthProgress: false })
      }
    } else {
      this.setState({ autoAuthProgress: false })
    }
  }

  componentDidUpdate (prevProps, prevState, snapshot) {
    if (prevState.code !== this.state.code && this.state.code.length >= 6) {
      this.setState({ autoAuthProgress: true })
      this.authentification(this.state.code)
    }
  }

  render () {
    let secretCode = null
    let buttons = null

    if (this.props.userToken !== null) {
      return <Redirect to='/'/>
    }

    if (this.state.code.length > 0) {
      secretCode =
        <div className="secret-code">
          {'*'.repeat(this.state.code.length)}
          <button className="cross" onClick={this.resetCode}>X</button>
        </div>
    }

    if (!this.state.autoAuthProgress) {
      buttons = <div className="buttons">
        {
          this.state.buttonList.map(button =>
            <button key={button} value={button} onClick={this.addCodeValue}>{button}</button>
          )
        }
      </div>
    } else {
      buttons = <div>Authentification automatique ...</div>
    }

    return <div className="authentification">
      {buttons}
      {secretCode}
    </div>
  }
}

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
