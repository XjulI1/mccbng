import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import {
  faChartPie,
  faCheck,
  faCogs,
  faCreditCard,
  faExchangeAlt,
  faList,
  faMoneyBill,
  faPlus,
  faRetweet,
  faSearch,
  faTimesCircle,
  faRedo,
  faMoneyBillAlt,
  faHistory,
  faFunnelDollar,
  faChartArea,
  faEyeSlash,
  faSignOutAlt,
  faSearchPlus,
  faChevronUp,
  faChevronDown,
  faHamburger,
  faBug,
  faToggleOn,
  faToggleOff,
  faUserEdit,
  faUserCog,
  faSave,
  faSpinner,
  faInfoCircle,
  faExclamationCircle,
  faCheckCircle,
  faHome,
  faMapMarkerAlt,
  faCalendar,
  faWallet,
  faBuilding,
  faPercent
} from '@fortawesome/free-solid-svg-icons'

const FontAwesome = {
  load: () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    library.add({
      faChartPie,
      faCheck,
      faCogs,
      faCreditCard,
      faExchangeAlt,
      faList,
      faMoneyBill,
      faPlus,
      faRetweet,
      faSearch,
      faTimesCircle,
      faRedo,
      faMoneyBillAlt,
      faHistory,
      faFunnelDollar,
      faChartArea,
      faEyeSlash,
      faSignOutAlt,
      faSearchPlus,
      faChevronUp,
      faChevronDown,
      faHamburger,
      faBug,
      faToggleOn,
      faToggleOff,
      faUserEdit,
      faUserCog,
      faSave,
      faSpinner,
      faInfoCircle,
      faExclamationCircle,
      faCheckCircle,
      faHome,
      faMapMarkerAlt,
      faCalendar,
      faWallet,
      faBuilding,
      faPercent
    } as any)
  }
}

FontAwesome.load()

export default FontAwesomeIcon
