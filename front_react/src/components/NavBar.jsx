import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import 'mccbng_styles/components/NavBar.scss'

class NavBar extends React.Component {
  render () {
    return <div className="nav-bar btn-group" role="group">
      <button className="btn btn-warning all-account-button disabled">
        <FontAwesomeIcon icon="list"/>
      </button>
      <button className="btn btn-success virement-button disabled">
        <FontAwesomeIcon icon="exchange-alt"/>
      </button>
      <button className="btn btn-primary new-operation-button disabled">
        <FontAwesomeIcon icon="plus"/>
      </button>
      <button className="btn btn-info operation-recurrente-button disabled">
        <FontAwesomeIcon icon="retweet"/>
      </button>
      <button className="btn btn-danger params-button disabled">
        <FontAwesomeIcon icon="cogs"/>
      </button>
    </div>
  }
}

export default NavBar
