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
      :style="{ '--tab-color': tab.color }"
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
  import { useRoute, useRouter } from '#imports'
  import { useDisplayStore } from '@/stores/display'
  import type { RouteLocationNormalizedLoaded } from 'vue-router'

  const route = useRoute()
  const router = useRouter()
  const displayStore = useDisplayStore()


  type Tab = {
    label: string
    icon: string
    path: string
    color: string
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
      label: 'Accueil',
      icon: 'home',
      path: '/',
      color: '#667eea',
      match: (r) => r.path === '/'
    },
    {
      label: 'Gestion',
      icon: 'building',
      path: '/gestion',
      color: '#6f42c1',
      match: isGestionRoute
    },
    {
      label: 'Stats',
      icon: 'chart-pie',
      path: '/stats',
      color: '#e0a800',
      match: (r) => r.path === '/stats'
    },
    {
      label: 'Réglages',
      icon: 'cogs',
      path: '/config',
      color: '#dc3545',
      match: isSettingsRoute
    }
  ]

  const goTo = (path: string) => {
    displayStore.toggleAccountList(false)
    if (route.path !== path) {
      router.push(path)
    }
  }

</script>

<style lang="scss" scoped>
// Proportions de la tab bar flottante d'iOS / iPadOS 26 (Liquid Glass) :
// capsule de 62 pt, 4 pt de marge interne, pastille de sélection de 54 pt,
// icône de ~24 pt, libellé 10 pt semibold.
.tab-bar {
  display: flex;
  align-items: stretch;
  height: $navbar-height;
  padding: 4px;
  border-radius: calc($navbar-height / 2);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.tab {
  --tab-color: #2d3748;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  width: 76px;
  min-width: 0;
  padding: 0 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: calc(($navbar-height - 8px) / 2);
  color: var(--text-primary, #2d3748);
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
  font: inherit;
  -webkit-tap-highlight-color: transparent;
}

.tab:hover {
  background: color-mix(in srgb, var(--tab-color) 12%, transparent);
}

.tab.active {
  background: color-mix(in srgb, var(--tab-color) 16%, transparent);
}

.tab.active .tab-label {
  color: var(--tab-color);
}

.tab-icon {
  height: 24px;
  font-size: 22px;
  color: var(--tab-color);
}

.tab-label {
  font-size: 10px;
  line-height: 12px;
  font-weight: 600;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

// iPhone : la barre occupe toute la largeur disponible, onglets répartis à parts égales.
@media screen and (max-width: $mobile_BP_max_width) {
  .tab-bar {
    flex: 1;
    min-width: 0;
  }

  .tab {
    flex: 1;
    width: auto;
  }
}
</style>
