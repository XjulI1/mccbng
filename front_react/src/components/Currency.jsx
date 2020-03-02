import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

const Currency = ({ currencySymbol }) => (
  <span>
    {currencySymbol}
  </span>
)

Currency.propTypes = {
  currencySymbol: PropTypes.string.isRequired
}

const mapStateToProps = state => ({
  currencySymbol: state.Currency.value
})

export default connect(
  mapStateToProps
)(Currency)
