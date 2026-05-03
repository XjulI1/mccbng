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
      :aria-current="tab.match(route) ? 'page' : undefined"
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

  const isGestionRoute = (r: RouteLocationNormalizedLoaded) => {
    const p = r.path
    return (
      p === '/gestion' ||
      p === '/credits' || p === '/newCredit' || p.startsWith('/editCredit') ||
      p === '/biens' || p === '/newBien' || p.startsWith('/editBien') ||
      p === '/recurrOperation' || p === '/newRecurrOperation' || p.startsWith('/editRecurrOperation') ||
      p === '/amortissement'
    )
  }

  const isSettingsRoute = (r: RouteLocationNormalizedLoaded) =>
    r.path === '/config' || r.path === '/editUser'

  const tabs: Tab[] = [
    {
      label: 'Recherche',
      icon: 'search',
      path: '/search',
      match: (r) => r.path === '/search'
    },
    {
      label: 'Gestion',
      icon: 'building',
      path: '/gestion',
      match: isGestionRoute
    },
    {
      label: 'Stats',
      icon: 'chart-pie',
      path: '/stats',
      match: (r) => r.path === '/stats'
    },
    {
      label: 'Réglages',
      icon: 'cogs',
      path: '/config',
      match: isSettingsRoute
    }
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
  display: inline-flex;
  align-items: stretch;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 28px;
  background: var(--bg-glass, rgba(255, 255, 255, 0.75));
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12),
    0 1px 0 rgba(255, 255, 255, 0.4) inset;
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 64px;
  padding: 6px 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 22px;
  color: var(--text-primary, #2d3748);
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease;
  font: inherit;
  -webkit-tap-highlight-color: transparent;
}

.tab:hover {
  background: rgba(0, 0, 0, 0.04);
}

.tab.active {
  color: #667eea;
}

.tab.active .tab-icon {
  transform: scale(1.05);
}

.tab.active .tab-label {
  font-weight: 700;
}

.tab-icon {
  font-size: 20px;
  transition: transform 0.2s ease;
}

.tab-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.2px;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media screen and (max-width: $mobile_BP_max_width) {
  .tab {
    width: 58px;
  }

  .tab-icon {
    font-size: 19px;
  }
}
</style>
