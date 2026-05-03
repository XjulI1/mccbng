<template>
  <nav
    v-if="route.name !== 'Login'"
    class="tab-bar"
    role="navigation"
    aria-label="Navigation principale"
  >
    <button
      type="button"
      class="tab tab-burger"
      :class="{ active: displayAccountList }"
      :style="{ '--tab-color': '#4a5568' }"
      :aria-label="displayAccountList
        ? 'Fermer la liste des comptes'
        : 'Ouvrir la liste des comptes'"
      :aria-pressed="displayAccountList"
      @click="toggleCompteList"
    >
      <font-awesome-icon
        class="tab-icon"
        icon="hamburger"
      />
      <span class="tab-label">Comptes</span>
    </button>
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
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useStore } from 'vuex'
  import type { RouteLocationNormalizedLoaded } from 'vue-router'

  const route = useRoute()
  const router = useRouter()
  const store = useStore()

  const displayAccountList = computed(() => store.state.display.account_list)

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
      label: 'Recherche',
      icon: 'search',
      path: '/search',
      color: '#17a2b8',
      match: (r) => r.path === '/search'
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
    store.dispatch('toggleAccountList', false)
    if (route.path !== path) {
      router.push(path)
    }
  }

  const toggleCompteList = () => {
    store.dispatch('toggleAccountList')
  }
</script>

<style lang="scss" scoped>
.tab-bar {
  display: inline-flex;
  align-items: stretch;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 28px;
  background: var(--bg-dock, rgba(255, 255, 255, 0.55));
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12),
    0 1px 0 rgba(255, 255, 255, 0.4) inset;
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.tab {
  --tab-color: #2d3748;
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

.tab.active .tab-icon {
  transform: scale(1.05);
}

.tab.active .tab-label {
  color: var(--tab-color);
  font-weight: 700;
}

.tab-icon {
  font-size: 20px;
  color: var(--tab-color);
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

.tab-burger {
  display: none;
}

@media screen and (max-width: $mobile_BP_max_width) {
  .tab {
    width: 58px;
  }

  .tab-icon {
    font-size: 19px;
  }

  .tab-burger {
    display: flex;
  }
}
</style>
