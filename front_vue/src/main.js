import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import './plugins/registerServiceWorker'
import './plugins/bootstrap'
import './plugins/fontawesome'
import './plugins/vue2-touch-events'

Vue.config.productionTip = true

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
