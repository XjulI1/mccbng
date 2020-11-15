<template>
  <div class="login-page">
    <h3>Authentification</h3>

    <h5>Tapez votre code d'accès</h5>
    <br>
    <div
      v-if="autoAuthProgress"
      class="authentification"
    >
      Authentification automatique ...
    </div>
    <div
      v-else
      class="authentification"
    >
      <button
        v-for="value in buttonList"
        :key="value"
        class="btn btn-secondary"
        :value="value"
        @click="addNumber"
      >
        {{ value }}
      </button>
      <br>
      <div>
        <span
          v-for="(c, i) in code"
          :key="c + i"
          class="mask-code"
        >*</span>
        <button
          v-if="code.length > 0"
          class="btn btn-secondary cross"
          @click="crossDelete"
        >
          X
        </button>
      </div>
    </div>
  </div>
</template>

<script>
  import { auth, checkUserAuthentification, getTokenCookie, getUserIDCookie, saveCookies } from 'mccbng_services/auth'
  import randomListNumber from 'mccbng_helpers/randomListNumber'

  import 'mccbng_styles/routes/Login.scss'
  import 'mccbng_styles/components/Authentification.scss'

  export default {
    name: 'Login',

    data () {
      return {
        autoAuthProgress: true,
        buttonList: randomListNumber(),
        code: ''
      }
    },

    watch: {
      code (value) {
        if (value.length === 6) {
          auth(value, process.env.VUE_APP_API_URL)
            .then(({ userToken, ttl, userID }) => {
              this.endAuthentification({ userToken, ttl, userID })
            })
        }
      }
    },

    beforeCreate () {
      const userToken = getTokenCookie()
      const userID = getUserIDCookie()

      checkUserAuthentification({ userToken, userID, api_url: process.env.VUE_APP_API_URL })
        .then((isExist) => {
          if (isExist) {
            this.endAuthentification({ userID, userToken })
          } else {
            this.autoAuthProgress = false
          }
        })
    },

    methods: {
      addNumber (event) {
        this.code += event.target.value
      },

      crossDelete () {
        this.code = ''
      },

      endAuthentification ({ userToken, userID, ttl }) {
        this.$store.dispatch('saveUserToken', userToken)
        this.$store.dispatch('fetchUserByIDAndGenerateRecurringOp', userID)

        if (ttl) {
          saveCookies({ userToken, userID, ttl })
        }

        this.$router.replace({ name: 'Home' })
      }
    }
  }
</script>
