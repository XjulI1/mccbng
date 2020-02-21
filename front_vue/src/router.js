import Vue from 'vue'

import Router from 'vue-router'

import Home from '@/views/Home.vue'
import NewOperation from '@/views/RouteOverTheContent/NewOperation'
import EditOperation from '@/views/RouteOverTheContent/EditOperation'
import Search from '@/views/RouteOverTheContent/Search'

import RecurrOperation from '@/views/RecurrOperation'

import Stats from '@/views/Stats'
import Login from '@/views/Login'
import Config from '@/views/Config'

Vue.use(Router)

export default new Router({
  routes: [{
    path: '/',
    name: 'Home',
    component: Home,
    children: [{
      path: '/newOperation',
      name: 'Nouvelle opération',
      component: NewOperation
    }, {
      path: '/editOperation/:id',
      name: 'Edition opération',
      component: EditOperation
    }, {
      path: '/search',
      name: 'Search',
      component: Search
    }]
  }, {
    path: '/recurrOperation',
    name: 'Opérations récurrentes',
    component: RecurrOperation,
    meta: {
      disabledTotalHeader: true
    }
  }, {
    path: '/stats',
    name: 'Stats',
    component: Stats,
    meta: {
      disabledTotalHeader: true
    }
  }, {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      disabledTotalHeader: true
    }
  }, {
    path: '/config',
    name: 'Config',
    component: Config,
    meta: {
      disabledTotalHeader: true
    }
  }]
})
