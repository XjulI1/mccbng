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
  faTimesCircle
} from '@fortawesome/free-solid-svg-icons'

export default {
  load: () => {
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
      faTimesCircle
    })
  }
}
