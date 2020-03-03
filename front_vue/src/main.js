import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store/store'
import './registerServiceWorker'
import BootstrapVue from 'bootstrap-vue'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import FontAwesome from './fontawesome'

Vue.component('font-awesome-icon', FontAwesomeIcon)

FontAwesome.load()

Vue.config.productionTip = true

new Vue({
  router,
  store,
  BootstrapVue,
  render: h => h(App)
}).$mount('#app')
