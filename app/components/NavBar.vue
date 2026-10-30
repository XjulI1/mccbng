<template>
  <nav
    v-if="route.name !== 'Login'"
    class="tab-bar"
    :class="{ minimized }"
    :style="{ '--tab-count': tabs.length }"
    role="navigation"
    aria-label="Navigation principale"
  >
    <span
      class="tab-pill"
      :class="[`to-${direction}`, { pressed, hidden: pillIndex < 0 }]"
      :style="{ '--pill-index': Math.max(pillIndex, 0), '--pill-color': tabs[pillIndex]?.color }"
      aria-hidden="true"
    />
    <button
      v-for="(tab, index) in tabs"
      :key="tab.path"
      type="button"
      class="tab"
      :class="{ active: tab.match(route) }"
      :style="{ '--tab-color': tab.color }"
      :aria-current="tab.match(route) ? 'page' : undefined"
      @pointerdown="press(index)"
      @pointerup="pressed = false"
      @pointercancel="cancelPress"
      @pointerleave="pressed && cancelPress()"
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
  import { computed, ref, watch } from 'vue'
  import { useRoute, useRouter } from '#imports'
  import { useDisplayStore } from '@/stores/display'
  import type { RouteLocationNormalizedLoaded } from 'vue-router'

  defineProps<{ minimized?: boolean }>()

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

  // Pastille de sélection unique (comme sur iOS 26) : elle rejoint l'onglet touché dès l'appui,
  // grossit tant qu'il est maintenu, puis reste sur l'onglet actif une fois la navigation faite.
  const activeIndex = computed(() => tabs.findIndex((tab) => tab.match(route)))
  const targetIndex = ref<number | null>(null)
  const pressed = ref(false)
  const pillIndex = computed(() => targetIndex.value ?? activeIndex.value)

  // Sens du déplacement : le bord avant part en premier, le bord arrière suit, d'où l'étirement.
  const direction = ref<'left' | 'right'>('right')
  watch(pillIndex, (to, from) => {
    if (to >= 0 && from >= 0 && to !== from) direction.value = to > from ? 'right' : 'left'
  })

  const press = (index: number) => {
    targetIndex.value = index
    pressed.value = true
  }

  const cancelPress = () => {
    pressed.value = false
    targetIndex.value = null
  }

  const goTo = (path: string) => {
    pressed.value = false
    displayStore.toggleAccountList(false)
    if (route.path !== path) {
      router.push(path).finally(() => { targetIndex.value = null })
    } else {
      targetIndex.value = null
    }
  }

</script>

<style lang="scss" scoped>
// Tab bar flottante d'iOS / iPadOS 26 (Liquid Glass) : capsule de 62 pt, 4 pt de marge interne,
// pastille de sélection de 54 pt, icône de ~24 pt, libellé 10 pt semibold.
// Repliée au défilement (48 pt, icônes seules).
@mixin pill-transition($easing, $left, $right) {
  transition:
    left $left $easing,
    right $right $easing,
    transform 0.3s $easing,
    background-color 0.25s ease,
    box-shadow 0.25s ease,
    opacity 0.2s ease;
}

.tab-bar {
  @include liquid-glass;
  display: flex;
  align-items: stretch;
  height: $navbar-height;
  padding: 4px;
  border-radius: calc($navbar-height / 2);
  transition: height 0.4s $spring-fallback;
  transition: height 0.4s $spring;
}

.tab-bar.minimized {
  height: $navbar-height-minimized;
}

.tab-pill {
  // Largeur d'un onglet : les onglets se partagent à parts égales la largeur intérieure.
  --slot: calc((100% - 8px) / var(--tab-count));
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: calc(4px + var(--pill-index) * var(--slot));
  right: calc(4px + (var(--tab-count) - 1 - var(--pill-index)) * var(--slot));
  border-radius: calc(($navbar-height - 8px) / 2);
  background: color-mix(in srgb, var(--pill-color) 16%, transparent);
  pointer-events: none;

  &.to-right {
    @include pill-transition($spring-fallback, 0.5s, 0.35s);
    @include pill-transition($spring, 0.5s, 0.35s);
  }

  &.to-left {
    @include pill-transition($spring-fallback, 0.35s, 0.5s);
    @include pill-transition($spring, 0.35s, 0.5s);
  }

  // Appui maintenu : la pastille se soulève comme une loupe, plus claire et ombrée.
  &.pressed {
    transform: scale(1.1);
    background: color-mix(in srgb, var(--pill-color) 18%, var(--glass-pill-pressed));
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  &.hidden {
    opacity: 0;
  }
}

.tab {
  --tab-color: #2d3748;
  position: relative;
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
  transition: background-color 0.2s ease;
  font: inherit;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

@media (hover: hover) {
  .tab:not(.active):hover {
    background: color-mix(in srgb, var(--tab-color) 8%, transparent);
  }
}

.tab.active .tab-label {
  color: var(--tab-color);
}

.tab-icon {
  height: 24px;
  font-size: 22px;
  color: var(--tab-color);
  transform-origin: center;
  transition: scale 0.4s $spring-fallback;
  transition: scale 0.4s $spring;
}

.tab-label {
  font-size: 10px;
  line-height: 12px;
  max-height: 12px;
  font-weight: 600;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  transition:
    opacity 0.2s ease,
    max-height 0.3s ease;
}

.minimized .tab-label {
  opacity: 0;
  max-height: 0;
}

// Icônes réduites dans la même proportion que la barre (62 → 48 pt).
.minimized .tab-icon {
  scale: 0.82;
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

@media (prefers-reduced-motion: reduce) {
  .tab-icon {
    transition: none;
  }

  .tab-bar,
  .tab-pill.to-left,
  .tab-pill.to-right {
    transition: background-color 0.2s ease, opacity 0.2s ease;
  }

  .tab-pill.pressed {
    transform: none;
  }
}
</style>
