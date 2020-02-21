import React from 'react'
import PropTypes from 'prop-types'

const Currency = ({ currencySymbol }) => (
  <span>
    {currencySymbol}
  </span>
)

Currency.propTypes = {
  currencySymbol: PropTypes.string.isRequired
}

export default Currency
