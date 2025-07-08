<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <div class="lock-icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 10V8C6 5.79086 7.79086 4 10 4H14C16.2091 4 18 5.79086 18 8V10"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <rect
              x="3"
              y="10"
              width="18"
              height="10"
              rx="2"
              stroke="currentColor"
              stroke-width="2"
            />
            <circle
              cx="12"
              cy="15"
              r="1"
              fill="currentColor"
            />
          </svg>
        </div>
        <h2>Authentification</h2>
        <p>Saisissez votre code d'accès sécurisé</p>
      </div>

      <div
        v-if="autoAuthProgress"
        class="auto-auth"
      >
        <div class="loading-spinner" />
        <p>Authentification automatique en cours...</p>
      </div>

      <div
        v-else
        class="auth-content"
      >
        <div class="code-display">
          <div class="code-dots">
            <div
              v-for="i in 6"
              :key="i"
              class="dot"
              :class="{ filled: i <= code.length }"
            />
          </div>
          <div
            v-if="error && !code"
            class="error-message"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="2"
              />
              <line
                x1="15"
                y1="9"
                x2="9"
                y2="15"
                stroke="currentColor"
                stroke-width="2"
              />
              <line
                x1="9"
                y1="9"
                x2="15"
                y2="15"
                stroke="currentColor"
                stroke-width="2"
              />
            </svg>
            Code incorrect, veuillez réessayer
          </div>
        </div>

        <div class="keypad">
          <button
            v-for="value in buttonList"
            :key="value"
            class="keypad-btn"
            :value="value"
            @click="addNumber"
          >
            {{ value }}
          </button>
          <button style="visibility: hidden" />
          <button
            v-if="code.length > 0"
            class="keypad-btn clear-btn"
            @click="crossDelete"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21 4H8L1 12L8 20H21C21.5523 20 22 19.5523 22 19V5C22 4.44772 21.5523 4 21 4Z"
                stroke="currentColor"
                stroke-width="2"
              />
              <line
                x1="18"
                y1="9"
                x2="12"
                y2="15"
                stroke="currentColor"
                stroke-width="2"
              />
              <line
                x1="12"
                y1="9"
                x2="18"
                y2="15"
                stroke="currentColor"
                stroke-width="2"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useStore } from 'vuex'
  import {
    auth,
    checkUserAuthentification,
    getTokenCookie,
    getUserIDCookie,
    saveCookies
  } from '@/services/auth'
  import randomListNumber from '@/helpers/randomListNumber'

  const router = useRouter()
  const store = useStore()

  const autoAuthProgress = ref(true)
  const buttonList = ref(randomListNumber())
  const code = ref('')
  const error = ref(false)

  const endAuthentification = ({ userToken, userID }) => {
    store.dispatch('saveUserToken', userToken)
    store.dispatch('fetchUserByIDAndGenerateRecurringOp', userID)

    saveCookies({ userToken, userID })

    router.replace({ name: 'Home' })
  }

  watch(code, (value) => {
    if (value.length === 6) {
      auth(value, import.meta.env.VITE_API_URL)
        .then(({ userToken, ttl, userID }) => {
          endAuthentification({ userToken, ttl, userID })
        })
        .catch(() => {
          error.value = true
          code.value = ''
        })
    }
  })

  // Equivalent to beforeCreate
  const userToken = getTokenCookie()
  const userID = getUserIDCookie()

  checkUserAuthentification({
    userToken,
    userID,
    apiUrl: import.meta.env.VITE_API_URL
  }).then((isExist) => {
    if (isExist) {
      endAuthentification({ userID, userToken })
    } else {
      autoAuthProgress.value = false
    }
  })

  onMounted(() => {
    window.addEventListener('keydown', (event) => {
      if (event.key >= 0 && event.key <= 9) {
        code.value += event.key
      }
    })
  })

  const addNumber = (event) => {
    code.value += event.target.value
  }

  const crossDelete = () => {
    code.value = ''
  }
</script>

<style lang="scss" scoped>
.login-page {
  min-height: calc(100vh - $header-height);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  padding: 20px;
}

.login-container {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 40px 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  text-align: center;
  max-width: 400px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.2);

  @media (max-width: 480px) {
    padding: 32px 24px;
    margin: 0 16px;
  }
}

.login-header {
  margin-bottom: 32px;

  .lock-icon {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);

    svg {
      color: white;
    }
  }

  h2 {
    color: #2d3748;
    font-size: 28px;
    font-weight: 700;
    margin: 0 0 8px 0;
    letter-spacing: -0.5px;
  }

  p {
    color: #718096;
    font-size: 16px;
    margin: 0;
    font-weight: 400;
  }
}

.auto-auth {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e2e8f0;
    border-top: 3px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  p {
    color: #718096;
    font-size: 16px;
    margin: 0;
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.auth-content {
  .code-display {
    margin-bottom: 40px;

    .code-dots {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 16px;

      .dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #e2e8f0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

        &.filled {
          background: linear-gradient(135deg, #667eea, #764ba2);
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
      }
    }

    .error-message {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #e53e3e;
      font-size: 14px;
      font-weight: 500;
      padding: 12px 16px;
      background: rgba(254, 178, 178, 0.2);
      border-radius: 12px;
      border: 1px solid rgba(254, 178, 178, 0.3);

      svg {
        flex-shrink: 0;
      }
    }
  }

  .keypad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    max-width: 240px;
    margin: 0 auto;

    .keypad-btn {
      width: 64px;
      height: 64px;
      border: none;
      border-radius: 16px;
      background: #f7fafc;
      color: #2d3748;
      font-size: 24px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

      &:hover {
        background: #edf2f7;
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      }

      &:active {
        transform: translateY(0);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }

      &.clear-btn {
        width: 64px;
        height: 64px;
        border: none;
        border-radius: 16px;
        background: #fed7d7;
        color: #e53e3e;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background: #feb2b2;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        }

        &:active {
          transform: translateY(0);
        }
      }
    }
  }
}
</style>
