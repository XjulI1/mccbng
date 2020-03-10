import React from 'react'

import 'mccbng_styles/components/LeftPanel.scss'
import AccountList from './LeftPanel/AccountList'

class LeftPanel extends React.Component {

  render () {
    return (<div className="left-panel">
      <AccountList/>
    </div>)
  }
}


export default LeftPanel
