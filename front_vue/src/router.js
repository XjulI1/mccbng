import Vue from 'vue'

import Router from 'vue-router'

import Home from '@/views/Home.vue'
import RouteOverTheContent from '@/views/RouteOverTheContent'
import OperationsRecurrentes from '@/views/OperationsRecurrentes'
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
      component: RouteOverTheContent,
      props: {
        componentName: 'operation-form'
      }
    }, {
      path: '/editOperation/:id',
      name: 'Edition opération',
      component: RouteOverTheContent,
      props: {
        componentName: 'operation-form'
      }
    }, {
      path: '/search',
      name: 'Search',
      component: RouteOverTheContent,
      props: {
        componentName: 'search'
      }
    }]
  }, {
    path: '/recurrOperation',
    name: 'Opérations récurrentes',
    component: OperationsRecurrentes,
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
