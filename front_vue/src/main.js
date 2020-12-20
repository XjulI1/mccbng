import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import Vue2TouchEvents from 'vue2-touch-events'
import fontawesome from './plugins/fontawesome'

import './registerServiceWorker'

const app = createApp(App)

app.use(store)
app.use(router)
app.use(Vue2TouchEvents)

app.component('FontAwesomeIcon', fontawesome)

app.mount('#app')
