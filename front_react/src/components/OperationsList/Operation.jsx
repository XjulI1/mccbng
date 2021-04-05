import React from 'react'
import PropTypes from 'prop-types'

import 'mccbng_styles/components/OperationsList/Operation.scss'

import { checkBoxID, generateCssVariables, generateDateOperationVariables } from 'mccbng_helpers/components/Operation'
import { formatAmount } from "mccbng_helpers/format"

class Operation extends React.Component {
  static propTypes = {
    operation: PropTypes.object.isRequired
  }

  constructor (props) {
    super(props)

    this.state = {
      checkBoxID: checkBoxID(props.operation.IDop),
      css: generateCssVariables(props.operation),
      dateOperation: generateDateOperationVariables(props.operation)
    }
  }

  render () {
    const { operation } = this.props
    const currency = '€'

    return <div className='operation'>
      <input id={this.state.checkBoxID} value="operation.CheckOp" type="checkbox" disabled/>

      <div className={this.state.css.category + ' label'}>
        <label htmlFor={this.state.checkBoxID}>
          {operation.NomOp}
          <br/>
          {this.state.dateOperation}
        </label>
      </div>

      <div className={this.state.css.montant + ' montant'}>
        {formatAmount(operation.MontantOp)}{currency}
      </div>
    </div>
  }
}

export default Operation
