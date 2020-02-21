// For authoring Nightwatch tests, see
// http://nightwatchjs.org/guide#usage

module.exports = {
  'default e2e tests': function test (browser) {
    // automatically uses dev Server port from /config.index.js
    // default: http://localhost:8080
    // see nightwatch.conf.js
    const devServer = 'http://localhost:8080'

    browser
      .url(devServer + '/#/status')
      .waitForElementVisible('#app', 5000)
      .assert.elementPresent('.status')
      .assert.containsText('h1', 'Servers status')
      .assert.elementCount('img', 1)
      .end()
  }
}
