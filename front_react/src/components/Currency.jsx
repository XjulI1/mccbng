import React from 'react'
import PropTypes from 'prop-types'

const Currency = () => (
  <span>
    €
  </span>
)

Currency.propTypes = {
  currencySymbol: PropTypes.string.isRequired
}

export default Currency
