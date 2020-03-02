module.exports = {
  // ...other vue-cli plugin options...
  pwa: {
    workboxOptions: {
      skipWaiting: true
    }
  },

  css: {
    loaderOptions: {
      sass: {
        prependData: ' @import "../front_global/styles/variables.scss";'
      }
    }
  }
}
