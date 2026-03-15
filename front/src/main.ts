import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import Vue3TouchEvents from 'vue3-touch-events'
import fontawesome from './plugins/fontawesome'

import './registerServiceWorker'

const app = createApp(App)

app.use(store)
app.use(router)
app.use(Vue3TouchEvents as any)

app.component('FontAwesomeIcon', fontawesome)

app.mount('#app')
