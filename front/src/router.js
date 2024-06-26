import { createRouter, createWebHistory } from 'vue-router'

const Home = () => import(/* webpackChunkName: "home" */ './views/Home.vue')
const Stats = () => import(/* webpackChunkName: "stats" */ './views/Stats.vue')
const Login = () => import(/* webpackChunkName: "login" */ './views/Login.vue')
const Config = () => import(/* webpackChunkName: "config" */ './views/Config.vue')
const OperationsRecurrentes = () => import(/* webpackChunkName: "operecur" */ './views/OperationsRecurrentes.vue')
const Amortissement = () => import(/* webpackChunkName: "operecur" */ './views/Amortissement.vue')
const RouteOverTheContent = () => import(/* webpackChunkName: "othercontent" */ './views/RouteOverTheContent.vue')

export default createRouter({
  history: createWebHistory(),
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
    }, {
      path: '/transfert',
      name: 'Virement',
      component: RouteOverTheContent,
      props: {
        componentName: 'transfert-form'
      }
    }, {
      path: '/retrait',
      name: 'Retrait',
      component: RouteOverTheContent,
      props: {
        componentName: 'transfert-form'
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
    path: '/amortissement',
    name: 'Amortissement',
    component: Amortissement,
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
