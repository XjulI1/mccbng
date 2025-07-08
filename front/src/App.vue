<template>
  <div
    id="app"
    class="root-app"
  >
    <account-header />
    <div class="container-flex">
      <div
        class="left-panel"
        :class="{ 'mask-panel': !displayAccountList }"
      >
        <CompteList v-touch:swipe.left="closeAccountList" />
        <TimeSeriesEvolutionSoldes />
      </div>
      <router-view
        v-touch:swipe.right="openAccountList"
        class="right-panel"
        :class="{ 'mask-panel': displayAccountList }"
      />
    </div>
    <NavBar />
  </div>
</template>

<script setup>
  import { computed, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useStore } from 'vuex'

  import NavBar from '@/components/NavBar.vue'
  import CompteList from '@/components/CompteList/index.vue'
  import AccountHeader from '@/components/AccountHeader.vue'
  import TimeSeriesEvolutionSoldes from './components/Stats/TimeSeriesEvolutionSoldes.vue'

  import '@/styles/bootstrap.css'

  const router = useRouter()
  const store = useStore()

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
  font-family: source-code-pro, Menlo, Monaco, Consolas, "Courier New",
    monospace;
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
  padding-top: $header-height;

  .container-flex {
    display: flex;
  }

  .right-panel {
    width: 100%;
    min-height: calc(100vh - #{$header-height} - #{$navbar-height});
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
  }

  @media screen and (max-width: $mobile_BP_max_width) {
    margin-top: 0;
    background-color: rgba(242, 242, 242, 0.95);
    width: 100%;
    padding-top: 3px;
    padding-bottom: calc(#{$navbar-height-mobile} + 5px);
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
