/* eslint-disable no-console */

import { register } from 'register-service-worker'

if (process.env.NODE_ENV === 'production') {
  register(`/service-worker.js`, {
    ready () {
    },
    cached () {
    },
    updated () {
    },
    offline () {
    },
    error (error) {
      console.error('Error during service worker registration:', error)
    }
  })
}
