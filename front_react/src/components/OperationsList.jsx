import React from 'react'
import PropTypes from 'prop-types'

import { connect } from 'react-redux'
import { setActiveAccount } from '../store/Account/action'
import { saveCurrentAccountOperations } from '../store/Operation/action'
import { fetchOperationsForAccount } from 'mccbng_services/operation'
import Operation from './OperationsList/Operation'

class OperationsList extends React.Component {
  static propTypes = {
    userFavoris: PropTypes.number,
    userToken: PropTypes.string,
    activeAccount: PropTypes.object,
    accountList: PropTypes.array,
    operationsOfActiveAccount: PropTypes.array,
    setOperationsList: PropTypes.func.isRequired,
    setActiveAccount: PropTypes.func.isRequired
  }

  componentDidUpdate (prevProps, prevState, snapshot) {
    if (this.props.activeAccount.IDcompte === undefined && this.props.accountList.length !== 0) {
      this.props.setActiveAccount(this.props.userFavoris)
    }

    if (this.props.activeAccount.IDcompte !== undefined && this.props.operationsOfActiveAccount === undefined) {
      fetchOperationsForAccount(this.props.activeAccount.IDcompte, this.props.userToken, process.env.REACT_APP_API_URL)
        .then((operationsList) => {
          this.props.setOperationsList(operationsList)
        })
    }
  }

  render () {
    const { operationsOfActiveAccount } = this.props
    const operationsList = (operationsOfActiveAccount || []).map(operation => (
      <Operation
        key={operation.IDop}
        operation={operation}
      />
    ))

    return <div className="operation-list">
      {operationsList}
    </div>
  }
}

const mapStateToProps = state => ({
  userFavoris: state.User.favoris,
  userToken: state.User.token,
  activeAccount: state.Account.activeAccount,
  accountList: state.Account.accountList,
  operationsOfActiveAccount: state.Operation.operationsOfActiveAccount
})

const mapDispatchToProps = dispatch => {
  return {
    setActiveAccount: accountID => {
      dispatch(setActiveAccount(accountID))
    },

    setOperationsList: operationsList => {
      dispatch(saveCurrentAccountOperations(operationsList))
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OperationsList)

