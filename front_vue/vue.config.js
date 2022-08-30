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
        additionalData: ' @import "../front_global/styles/variables.scss";'
      }
    }
  },

  lintOnSave: false
}
