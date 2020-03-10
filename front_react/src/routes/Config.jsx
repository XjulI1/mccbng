import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import 'mccbng_styles/routes/Config.scss'

class Config extends React.Component {
  render () {
    return <div className="config">
      <a className="btn btn-info" href="/">
        <FontAwesomeIcon icon="redo"/>
        Reload App
      </a>
    </div>
  }
}

export default Config
