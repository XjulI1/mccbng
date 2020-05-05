import React from 'react'
import PropTypes from 'prop-types'

import { connect } from 'react-redux'
import { setActiveAccount } from '../store/Account/action'

class OperationsList extends React.Component {
  static propTypes = {
    userFavoris: PropTypes.number,
    activeAccount: PropTypes.object,
    accountList: PropTypes.array,
    setActiveAccount: PropTypes.func.isRequired
  }

  componentDidUpdate (prevProps, prevState, snapshot) {
    if (this.props.activeAccount.IDcompte === undefined && this.props.accountList.length !== 0) {
      this.props.setActiveAccount(this.props.userFavoris)
    }
  }

  render () {
    return <div className="operation-list">
      Operation list
    </div>
  }
}

const mapStateToProps = state => ({
  userFavoris: state.User.favoris,
  activeAccount: state.Account.activeAccount,
  accountList: state.Account.accountList
})

const mapDispatchToProps = dispatch => {
  return {
    setActiveAccount: accountID => {
      dispatch(setActiveAccount(accountID))
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OperationsList)

