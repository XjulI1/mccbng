import React from 'react'
import PropTypes from 'prop-types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import 'mccbng_styles/components/Account.scss'
import { formatAmount } from "mccbng_helpers/format"

class Account extends React.Component {
  static defaultProps = {
    faIcon: undefined,
    noColor: false,
    boldTitle: false
  }

  static propTypes = {
    name: PropTypes.string.isRequired,
    solde: PropTypes.number.isRequired,
    currency: PropTypes.string.isRequired,
    faIcon: PropTypes.string,
    noColor: PropTypes.bool,
    boldTitle: PropTypes.bool
  }

  soldeColor () {
    if (this.props.noColor) {
      return ''
    }

    return this.props.solde >= 0 ? 'soldeIn' : 'soldeOut'
  }

  render () {

    const faIcon = this.props.faIcon ? <FontAwesomeIcon icon={this.props.faIcon} className="icon-fa"/> : ''

    return (
      <div className='account-informations cursor-pointer'>
        <div className={'account-name ' + (this.props.boldTitle ? 'bold-title' : '')}>
          {faIcon}
          {this.props.name}
        </div>
        <div className={'account-solde ' + this.soldeColor()}>
          {formatAmount(this.props.solde)} {this.props.currency}
        </div>
      </div>
    )
  }
}

export default Account
