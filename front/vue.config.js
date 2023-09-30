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
        additionalData: ' @import "./src/styles/variables.scss";'
      }
    }
  },

  lintOnSave: false
}
