import Home from './routes/Home'
import Config from './routes/Config'
import Login from './routes/Login'

const routes = [
  {
    name: 'homepage',
    path: '/',
    component: Home
  },
  {
    name: 'config',
    path: '/config',
    component: Config
  },
  {
    name: 'login',
    path: '/login',
    component: Login
  }
]

export default routes
