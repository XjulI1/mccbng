<template>
  <div class="login-page">
    <h3>Authentification</h3>

    <h5>Tapez votre code d'accès</h5>
    <br />
    <div v-if="autoAuthProgress" class="authentification">
      Authentification automatique ...
    </div>
    <div v-else class="authentification">
      <button
        v-for="value in buttonList"
        :key="value"
        class="btn btn-secondary"
        :value="value"
        @click="addNumber"
      >
        {{ value }}
      </button>
      <br />
      <div v-if="error && !code" class="message-error">Passcode incorrect</div>
      <br />
      <div>
        <span v-for="(c, i) in code" :key="c + i" class="mask-code">*</span>
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

<script setup>
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import {
  auth,
  checkUserAuthentification,
  getTokenCookie,
  getUserIDCookie,
  saveCookies,
} from "@/services/auth";
import randomListNumber from "@/helpers/randomListNumber";

const router = useRouter();
const store = useStore();

const autoAuthProgress = ref(true);
const buttonList = ref(randomListNumber());
const code = ref("");
const error = ref(false);

const endAuthentification = ({ userToken, userID }) => {
  store.dispatch("saveUserToken", userToken);
  store.dispatch("fetchUserByIDAndGenerateRecurringOp", userID);

  saveCookies({ userToken, userID });

  router.replace({ name: "Home" });
};

watch(code, (value) => {
  if (value.length === 6) {
    auth(value, process.env.VUE_APP_API_URL)
      .then(({ userToken, ttl, userID }) => {
        endAuthentification({ userToken, ttl, userID });
      })
      .catch(() => {
        error.value = true;
        code.value = "";
      });
  }
});

// Equivalent to beforeCreate
const userToken = getTokenCookie();
const userID = getUserIDCookie();

checkUserAuthentification({
  userToken,
  userID,
  apiUrl: process.env.VUE_APP_API_URL,
}).then((isExist) => {
  if (isExist) {
    endAuthentification({ userID, userToken });
  } else {
    autoAuthProgress.value = false;
  }
});

onMounted(() => {
  window.addEventListener("keydown", (event) => {
    if (event.key >= 0 && event.key <= 9) {
      code.value += event.key;
    }
  });
});

const addNumber = (event) => {
  code.value += event.target.value;
};

const crossDelete = () => {
  code.value = "";
};
</script>

<style lang="scss" scoped>
.login-page {
  padding: 1.3em;

  h2 {
    margin-top: 5px;
  }
}

.authentification {
  text-align: center;

  .buttons {
    margin-top: 30px;
  }

  button {
    margin-left: 20px;
    margin-right: 20px;
    margin-bottom: 40px;
    font-size: 2rem;
    width: 4rem;
    border-radius: 0.25rem;

    &.cross {
      font-size: 0.8rem;
      margin-bottom: 0;
      margin-left: 10px;
      padding: 0;
      width: 2rem;
      vertical-align: baseline;
    }
  }

  .secret-code {
    margin-left: 2rem;
  }
}

.message-error {
  color: red;
}
</style>
