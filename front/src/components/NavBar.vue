<template>
  <div
    v-if="route.name !== 'Login'"
    class="nav-bar btn-group"
    role="group"
    aria-label="Navigation principale"
  >
    <button
      v-for="tab in tabs"
      :key="tab.path"
      type="button"
      class="btn"
      :class="[tab.colorClass, { active: tab.match(route) }]"
      :aria-label="tab.label"
      :aria-current="tab.match(route) ? 'page' : undefined"
      @click="goTo(tab.path)"
    >
      <font-awesome-icon :icon="tab.icon" />
    </button>
  </div>
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
    colorClass: string
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
      colorClass: 'btn-info',
      match: (r) => r.path === '/search'
    },
    {
      label: 'Gestion',
      icon: 'building',
      path: '/gestion',
      colorClass: 'btn-credit',
      match: isGestionRoute
    },
    {
      label: 'Stats',
      icon: 'chart-pie',
      path: '/stats',
      colorClass: 'btn-warning',
      match: (r) => r.path === '/stats'
    },
    {
      label: 'Réglages',
      icon: 'cogs',
      path: '/config',
      colorClass: 'btn-danger',
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
.btn {
  display: inline-block;
  font-weight: 400;
  color: #fff;
  text-align: center;
  vertical-align: middle;
  cursor: pointer;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  background-color: transparent;
  border: 1px solid transparent;
  padding: 0.375rem 0.75rem;
  font-size: 1rem;
  line-height: 1.5;
  border-radius: 0.25rem;
  transition:
    color 0.15s ease-in-out,
    background-color 0.15s ease-in-out,
    border-color 0.15s ease-in-out,
    box-shadow 0.15s ease-in-out,
    transform 0.15s ease-in-out;
  text-decoration: none;
}

.btn-warning {
  color: #212529;
  background-color: #ffc107;
  border-color: #ffc107;
}

.btn-warning:hover {
  color: #212529;
  background-color: #e0a800;
  border-color: #d39e00;
}

.btn-danger {
  color: #fff;
  background-color: #dc3545;
  border-color: #dc3545;
}

.btn-danger:hover {
  color: #fff;
  background-color: #c82333;
  border-color: #bd2130;
}

.btn-credit {
  color: #fff;
  background-color: #6f42c1;
  border-color: #6f42c1;
}

.btn-credit:hover {
  color: #fff;
  background-color: #5a32a3;
  border-color: #4e2a8e;
}

.btn-info {
  color: #fff;
  background-color: #17a2b8;
  border-color: #17a2b8;
}

.btn-info:hover {
  color: #fff;
  background-color: #138496;
  border-color: #117a8b;
}

.nav-bar {
  padding: 6px 10px;
  height: auto;
  width: fit-content;
  max-width: 90%;
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-align: center;
  z-index: 100;
  border-radius: 18px;
  background-color: var(--bg-glass, rgba(255, 255, 255, 0.6));
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);

  @media screen and (max-width: $mobile_BP_max_width) {
    width: fit-content;
    max-width: 95%;
    bottom: 16px;
    padding: 5px 8px;
    gap: 6px;
  }

  &.btn-group {
    .btn {
      margin: 0;
      height: $navbar-height;
      width: 3rem;
      border: none;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      font-size: 1.2rem;
      font-weight: 600;
      border-radius: 12px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      &.active {
        transform: translateY(-1px);
        box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.9),
          0 4px 12px rgba(0, 0, 0, 0.25);
      }
    }
  }
}
</style>
