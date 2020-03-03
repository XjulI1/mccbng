import React from 'react'
import { Redirect, Route } from 'react-router-dom'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'

import routes from './routes'

import Header from './components/Header'
import LeftPanel from './components/LeftPanel'

import 'mccbng_styles/App.scss'

class App extends React.Component {
  static propTypes = {
    userToken: PropTypes.string
  }

  constructor (props) {
    super(props)

    this.state = {
      isConnected: false
    }
  }

  componentDidUpdate (prevProps, prevState, snapshot) {
    if (this.props.userToken !== prevProps.userToken) {
      this.setState({ isConnected: this.props.userToken !== undefined && this.props.userToken !== null })
    }
  }

  render () {
    let redirectAuth = null

    if (!this.state.isConnected) {
      redirectAuth = <Redirect to='/login'/>
    }

    return <div className='root-app'>
      <Header/>
      <div className="container-flex">
        <LeftPanel/>
        <div className="right-panel">
          {
            routes.map((route) => (
              <Route
                exact
                key={`route-${route.name}`}
                path={route.path}
                component={route.component}
              />
            ))
          }
        </div>
        {redirectAuth}
      </div>
    </div>
  }
}

const mapStateToProps = state => ({
  userToken: state.User.token
})

export default connect(
  mapStateToProps
)(App)
