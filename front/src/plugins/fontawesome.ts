import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import {
  faChartPie,
  faCheck,
  faCogs,
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
  faHamburger
} from '@fortawesome/free-solid-svg-icons'

const FontAwesome = {
  load: () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    library.add({
      faChartPie,
      faCheck,
      faCogs,
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
      faHamburger
    } as any)
  }
}

FontAwesome.load()

export default FontAwesomeIcon
