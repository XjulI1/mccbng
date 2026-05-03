<template>
  <div
    id="app"
    class="root-app"
    :class="{ 'is-login-page': route.name === 'Login' }"
  >
    <account-header :class="{ 'is-login-page': route.name === 'Login' }" />
    <div class="container-flex">
      <div
        class="left-panel"
        :class="{
          'mask-panel': !displayAccountList,
          'is-login-page': route.name === 'Login',
        }"
      >
        <CompteList v-touch:swipe.left="closeAccountList" />
      </div>
      <router-view
        v-touch:swipe.right="openAccountList"
        class="right-panel"
        :class="{ 'mask-panel': displayAccountList }"
      />
    </div>
    <div
      v-if="route.name !== 'Login'"
      class="bottom-dock"
    >
      <button
        v-if="!displayAccountList"
        type="button"
        class="dock-burger"
        aria-label="Ouvrir la liste des comptes"
        @click="openAccountList"
      >
        <font-awesome-icon icon="hamburger" />
      </button>
      <NavBar />
      <FabMenu />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useStore } from 'vuex'
  import { useGlobalTheme } from '@/composables/useTheme'
  import { useGlobalDebugTools } from '@/composables/useDebugTools'

  import NavBar from '@/components/NavBar.vue'
  import FabMenu from '@/components/FabMenu.vue'
  import CompteList from '@/components/CompteList/index.vue'
  import AccountHeader from '@/components/AccountHeader.vue'

  import '@/styles/main.css'

  const router = useRouter()
  const route = useRoute()
  const store = useStore()

  // Initialisation du système de thème
  useGlobalTheme()

  // Initialisation des outils de debug (chargement conditionnel d'Eruda)
  const { initDebugTools } = useGlobalDebugTools()
  initDebugTools()

  const userID = computed(() => store.state.user.id)
  const displayAccountList = computed(() => store.state.display.account_list)

  watch(userID, () => {
    store.dispatch('fetchAccountList')
    store.dispatch('fetchCategoryList')
  })

  // Equivalent to beforeCreate
  router.push('/login')

  const openAccountList = () => {
    store.dispatch('toggleAccountList', true)
  }

  const closeAccountList = () => {
    store.dispatch('toggleAccountList', false)
  }
</script>

<style lang="scss">
html {
  height: 100%;
}

body {
  margin: 0;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100%;
  position: relative;
  color: #2c3e50;
  line-height: 1.5rem;
}

code {
  font-family:
    source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace;
}

*,
::before,
::after {
  box-sizing: border-box;
}

hr {
  margin-top: 1rem;
  margin-bottom: 1rem;
  border: 0;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.root-app {
  padding-top: $header-height-and-margin;

  &.is-login-page {
    padding-top: 0;
  }

  .container-flex {
    display: flex;
  }

  .right-panel {
    width: 100%;
    min-height: calc(100vh - #{$header-height} - #{$navbar-height-and-margin});
  }

  .right-panel.login-page {
    width: 100%;
  }

  @media all and (min-width: $desktop_BP_min_width) {
    .right-panel {
      width: calc(100% - #{$left-panel-width});
    }
  }
}

.left-panel {
  display: none;

  @media all and (min-width: $desktop_BP_min_width) {
    display: block;
    width: $left-panel-width;
    margin-top: -$header-height-and-margin;

    &.is-login-page {
      display: none;
    }
  }

  @media screen and (max-width: $mobile_BP_max_width) {
    margin-top: 0;
    width: 100%;
    padding-top: 3px;
    padding-bottom: calc(#{$navbar-height-and-margin} + 5px);
  }
}

.left-panel {
  display: block;
}

.row {
  margin: 0 !important;
  padding: 0 !important;
}

.container {
  margin: 0 !important;
  padding: 0 !important;
}

.app-header.is-login-page {
  display: none !important;
}

.bottom-dock {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom, 0px);

  @media screen and (max-width: $mobile_BP_max_width) {
    bottom: 12px;
    gap: 8px;
  }
}

.dock-burger {
  display: none;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--bg-glass, rgba(255, 255, 255, 0.75));
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  color: var(--text-primary, #2d3748);
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12),
    0 1px 0 rgba(255, 255, 255, 0.4) inset;
  border: 1px solid rgba(255, 255, 255, 0.18);
  cursor: pointer;
  font-size: 20px;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }

  @media screen and (max-width: $mobile_BP_max_width) {
    display: flex;
  }
}

@media screen and (max-width: $mobile_BP_max_width) {
  .left-panel {
    z-index: 2;
    position: absolute;
    left: 0;
    transition: 0.3s;
  }

  .left-panel.mask-panel {
    left: -100%;
  }

  .right-panel.mask-panel {
    height: 100vh;
    overflow-y: hidden;
  }
}
</style>
