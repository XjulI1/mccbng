import React from 'react'
import { connect } from 'react-redux'

import { fetchAccountList, sumAllCompteForUser } from 'mccbng_services/compte'
import { saveAccountList, saveSumForAllAccounts } from '../../store/Account/action'

import Account from './AccountList/Account'

import {
  filterAvailableAccounts,
  filterBloquedAccounts,
  filterPorteFeuilleAccount,
  totalAvailable,
  totalGlobal
} from 'mccbng_store/compte'

class AccountList extends React.Component {
  componentDidUpdate (prevProps, prevState) {
    const { userID, userToken } = this.props
    const APIURL = process.env.REACT_APP_API_URL

    if (userID !== null && userToken !== null && (userID !== prevProps.userID || userToken !== prevProps.userToken)) {
      fetchAccountList(userID, userToken, APIURL)
        .then((accountList) => {
          this.props.saveAccountList(accountList)

          return sumAllCompteForUser(userID, userToken, APIURL)
        })
        .then((sumList) => {
          this.props.saveSumForAllAccounts(sumList)
        })
    }
  }

  render () {
    const availableAccounts = filterAvailableAccounts(this.props).map(account => (
      <Account key={account.IDcompte}
               name={account.NomCompte}
               solde={account.solde}
               currency={this.props.currency}
               faIcon="check"
      />
    ))

    const bloquedAccounts = filterBloquedAccounts(this.props).map(account => (
      <Account key={account.IDcompte}
               name={account.NomCompte}
               solde={account.solde}
               currency={this.props.currency}
               faIcon="times-circle"
      />
    ))

    const porteFeuilleAccount = filterPorteFeuilleAccount(this.props).map(account => (
      <Account key={account.IDcompte}
               name={account.NomCompte}
               solde={account.solde}
               currency={this.props.currency}
               faIcon="money-bill"
      />
    ))

    const calcTotalAvailable = totalAvailable(undefined, {
      availableCompte: filterAvailableAccounts(this.props),
      porteFeuilleCompte: filterPorteFeuilleAccount(this.props)
    })

    const calcTotalGlobal = totalGlobal(undefined, {
      bloquedCompte: filterBloquedAccounts(this.props),
      totalAvailable: calcTotalAvailable
    })

    return (
      <div className="accounts-list">
        <div className='available-accounts'>
          {availableAccounts}
        </div>
        <hr/>
        <div className='bloqued-accounts'>
          {bloquedAccounts}
        </div>
        <hr/>
        <div className='porte-feuille-account'>
          {porteFeuilleAccount}
        </div>
        <hr/>
        <Account
          name={'Total disponible'}
          solde={calcTotalAvailable}
          currency={this.props.currency}
          noColor={true}
          boldTitle={true}
        />
        <Account
          name={'Total global'}
          solde={calcTotalGlobal}
          currency={this.props.currency}
          noColor={true}
          boldTitle={true}
        />
      </div>
    )
  }
}

const mapStateToProps = state => ({
  userToken: state.User.token,
  userID: state.User.id,
  accountList: state.Account.accountList,
  currency: state.Account.currency
})

const mapDispatchToProps = dispatch => {
  return {
    saveAccountList: accountList => {
      dispatch(saveAccountList(accountList))
    },
    saveSumForAllAccounts: sumList => {
      dispatch(saveSumForAllAccounts(sumList))
    }
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AccountList)
