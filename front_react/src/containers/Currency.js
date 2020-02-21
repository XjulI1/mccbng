import { connect } from 'react-redux'
import Currency from '../components/Currency'

const mapStateToProps = state => ({
  currencySymbol: state.Currency.value
})

export default connect(
  mapStateToProps
)(Currency)
