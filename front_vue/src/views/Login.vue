<template>
  <div class="login-page">
    <h2>Authentification</h2>

    <h4>Tapez votre code d'accès</h4>

    <div class="buttons">
      <button v-for="value in buttonList" :key="value" :value="value" @click="addNumber">{{value}}</button>
    </div>
    <br>
    <div>
      <span class="maskCode" v-for="(c, i) in code" :key="c + i">*</span>
      <button class="cross" v-if="code.length > 0" @click="crossDelete">X</button>
    </div>
  </div>
</template>

<script>
  import { auth, saveCookies } from 'mccbng_services/auth'

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
        buttonList: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => {
          return 0.5 - Math.random()
        }),
        code: ''
      }
    },

    created () {
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

<style lang="scss" scoped>
  .login-page {
    text-align: center;
  }

  button {
    margin-left: 20px;
    margin-right: 20px;
    margin-bottom: 40px;
    font-size: 2rem;
    width: 3.5rem;

    &.cross {
      font-size: 0.9rem;
      width: 1.8rem;
    }
  }
</style>
