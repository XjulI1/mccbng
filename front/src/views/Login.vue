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

  const router = useRouter()
  const store = useStore()

  const autoAuthProgress = ref(true)
  const buttonList = ref(randomListNumber())
  const code = ref('')
  const error = ref(false)

  function randomListNumber () {
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => {
      return 0.5 - Math.random()
    })
  }

  const endAuthentification = ({ userToken, userID }) => {
    store.dispatch('saveUserToken', userToken)
    store.dispatch('fetchUserByIDAndGenerateRecurringOp', userID)

    saveCookies({ userToken, userID })

    router.replace({ name: 'Home' })
  }

  watch(code, (value) => {
    if (value.length === 6) {
      auth(value, import.meta.env.VITE_API_URL)
        .then(({ userToken, userID }) => {
          endAuthentification({ userToken, userID })
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
    apiUrl: import.meta.env.VITE_API_URL
  }).then((isExist) => {
    if (isExist) {
      endAuthentification({ userID, userToken })
    } else {
      autoAuthProgress.value = false
    }
  })

  onMounted(() => {
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      if (parseInt(event.key) >= 0 && parseInt(event.key) <= 9) {
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
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  padding: 20px;
}

.login-container {
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  padding: 40px 32px;
  box-shadow: var(--shadow-xl);
  text-align: center;
  max-width: 400px;
  width: 100%;
  border: var(--glass-border);

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
    background: var(--primary-gradient);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
    box-shadow: var(--shadow-glass);

    svg {
      color: white;
    }
  }

  h2 {
    color: var(--text-primary);
    font-size: 28px;
    font-weight: var(--font-weight-bold);
    margin: 0 0 8px 0;
    letter-spacing: -0.5px;
  }

  p {
    color: var(--text-muted);
    font-size: 16px;
    margin: 0;
    font-weight: var(--font-weight-normal);
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
    border: 3px solid var(--border-color);
    border-top: 3px solid var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  p {
    color: var(--text-muted);
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
        background: var(--border-color);
        transition: all var(--transition-smooth);

        &.filled {
          background: var(--primary-gradient);
          transform: scale(1.2);
          box-shadow: var(--shadow-btn);
        }
      }
    }

    .error-message {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--color-danger-dark);
      font-size: 14px;
      font-weight: var(--font-weight-medium);
      padding: 12px 16px;
      background: var(--bg-danger-light);
      border-radius: var(--radius-lg);
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
      border-radius: var(--radius-xl);
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-size: 24px;
      font-weight: var(--font-weight-semibold);
      cursor: pointer;
      transition: all var(--transition-fast);
      box-shadow: var(--shadow-sm);

      &:hover {
        background: var(--bg-muted);
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      &:active {
        transform: translateY(0);
        box-shadow: var(--shadow-sm);
      }

      &.clear-btn {
        width: 64px;
        height: 64px;
        border: none;
        border-radius: var(--radius-xl);
        background: var(--bg-danger-light);
        color: var(--color-danger-dark);
        cursor: pointer;
        transition: all var(--transition-fast);
        box-shadow: var(--shadow-sm);
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background: rgba(254, 178, 178, 0.4);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        &:active {
          transform: translateY(0);
        }
      }
    }
  }
}
</style>
