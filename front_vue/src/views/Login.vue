<template>
  <div class="login-page">
    <h3>Authentification</h3>

    <h5>Tapez votre code d'accès</h5>
    <br>
    <div class="authentification">
      <button v-for="value in buttonList" :key="value" :value="value" @click="addNumber">{{value}}</button>
      <br>
      <div>
        <span class="mask-code" v-for="(c, i) in code" :key="c + i">*</span>
        <button class="cross" v-if="code.length > 0" @click="crossDelete">X</button>
      </div>
    </div>
  </div>
</template>

<script>
  import { auth, saveCookies } from 'mccbng_services/auth'
  import randomListNumber from 'mccbng_helpers/randomListNumber'

  import 'mccbng_styles/routes/Login.scss'
  import 'mccbng_styles/components/Authentification.scss'

  export default {
    name: 'Login',

    watch: {
      code (value) {
        if (value.length === 6) {
          auth(value, process.env.VUE_APP_API_URL)
            .then(({ userToken, ttl, userID }) => {
              this.$store.dispatch('saveUserToken', userToken)
              this.$store.dispatch('fetchUserByIDAndActiveAccount', userID)

              saveCookies({ userToken, userID, ttl })

              this.$router.push('/')
            })
        }
      }
    },

    data () {
      return {
        buttonList: randomListNumber(),
        code: ''
      }
    },

    methods: {
      addNumber (event) {
        this.code += event.target.value
      },

      crossDelete () {
        this.code = ''
      }
    }
  }
</script>
