<template>
  <nav
    v-if="route.name !== 'Login'"
    class="tab-bar"
    role="navigation"
    aria-label="Navigation principale"
  >
    <button
      v-for="tab in tabs"
      :key="tab.path"
      type="button"
      class="tab"
      :class="{ active: tab.match(route) }"
      @click="goTo(tab.path)"
    >
      <font-awesome-icon
        class="tab-icon"
        :icon="tab.icon"
      />
      <span class="tab-label">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
  import { useRoute, useRouter } from 'vue-router'
  import { useStore } from 'vuex'
  import type { RouteLocationNormalizedLoaded } from 'vue-router'

  const route = useRoute()
  const router = useRouter()
  const store = useStore()

  type Tab = {
    label: string
    icon: string
    path: string
    match: (r: RouteLocationNormalizedLoaded) => boolean
  }

  const gestionPaths = ['/gestion', '/credits', '/biens', '/recurrOperation', '/amortissement']
  const settingsPaths = ['/config', '/editUser']

  const isHomeRoute = (r: RouteLocationNormalizedLoaded) =>
    r.path === '/' ||
    r.path === '/newOperation' ||
    r.path.startsWith('/editOperation') ||
    r.path === '/search' ||
    r.path === '/transfert' ||
    r.path === '/retrait'

  const isGestionRoute = (r: RouteLocationNormalizedLoaded) =>
    gestionPaths.some((p) => r.path === p || r.path.startsWith(p + '/')) ||
    r.path === '/newRecurrOperation' ||
    r.path.startsWith('/editRecurrOperation') ||
    r.path === '/newCredit' ||
    r.path.startsWith('/editCredit') ||
    r.path === '/newBien' ||
    r.path.startsWith('/editBien')

  const tabs: Tab[] = [
    { label: 'Comptes', icon: 'wallet', path: '/', match: isHomeRoute },
    { label: 'Gestion', icon: 'building', path: '/gestion', match: isGestionRoute },
    { label: 'Stats', icon: 'chart-pie', path: '/stats', match: (r) => r.path === '/stats' },
    { label: 'Réglages', icon: 'cogs', path: '/config', match: (r) => settingsPaths.includes(r.path) }
  ]

  const goTo = (path: string) => {
    store.dispatch('toggleAccountList', false)
    if (route.path !== path) {
      router.push(path)
    }
  }
</script>

<style lang="scss" scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: $navbar-height;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: var(--bg-glass, rgba(255, 255, 255, 0.95));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  display: flex;
  justify-content: space-around;
  align-items: stretch;
  z-index: 100;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary, #a0aec0);
  transition: color 0.2s ease, transform 0.2s ease;
  font: inherit;
  -webkit-tap-highlight-color: transparent;
}

.tab:hover {
  color: var(--text-primary, #4a5568);
}

.tab.active {
  color: var(--primary-color, #667eea);
}

.tab.active .tab-icon {
  transform: scale(1.1);
}

.tab-icon {
  font-size: 20px;
  transition: transform 0.2s ease;
}

.tab-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2px;
}
</style>
