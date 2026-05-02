<template>
  <div
    v-if="actions.length > 0"
    class="fab-wrapper"
  >
    <transition name="fade">
      <div
        v-if="expanded"
        class="fab-backdrop"
        @click="close"
      />
    </transition>

    <div class="fab-stack">
      <transition-group name="pop">
        <button
          v-for="action in expanded ? actions : []"
          :key="action.label"
          type="button"
          class="mini-fab"
          :class="action.color"
          @click="run(action)"
        >
          <span class="mini-fab-label">{{ action.label }}</span>
          <font-awesome-icon :icon="action.icon" />
        </button>
      </transition-group>

      <button
        type="button"
        class="fab"
        :class="{ expanded }"
        :aria-label="expanded ? 'Fermer le menu' : 'Ouvrir le menu d\'actions'"
        :aria-expanded="expanded"
        @click="toggle"
      >
        <font-awesome-icon icon="plus" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'

  type Action = {
    label: string
    icon: string
    color: string
    path: string
  }

  const route = useRoute()
  const router = useRouter()
  const expanded = ref(false)

  const homeActions: Action[] = [
    { label: 'Rechercher', icon: 'search', color: 'fab-info', path: '/search' },
    { label: 'Nouvelle opération', icon: 'plus', color: 'fab-primary', path: '/newOperation' },
    { label: 'Virement', icon: 'exchange-alt', color: 'fab-warning', path: '/transfert' }
  ]

  const gestionActions: Action[] = [
    { label: 'Nouvelle récurrente', icon: 'retweet', color: 'fab-info', path: '/newRecurrOperation' },
    { label: 'Nouveau crédit', icon: 'credit-card', color: 'fab-credit', path: '/newCredit' },
    { label: 'Nouveau bien', icon: 'home', color: 'fab-bien', path: '/newBien' }
  ]

  const isHomeContext = (path: string) =>
    path === '/' ||
    path === '/newOperation' ||
    path.startsWith('/editOperation') ||
    path === '/search' ||
    path === '/transfert' ||
    path === '/retrait'

  const isGestionContext = (path: string) =>
    path === '/gestion' ||
    path === '/credits' ||
    path === '/biens' ||
    path === '/recurrOperation' ||
    path === '/amortissement' ||
    path === '/newRecurrOperation' ||
    path.startsWith('/editRecurrOperation') ||
    path === '/newCredit' ||
    path.startsWith('/editCredit') ||
    path === '/newBien' ||
    path.startsWith('/editBien')

  const actions = computed<Action[]>(() => {
    if (isHomeContext(route.path)) return homeActions
    if (isGestionContext(route.path)) return gestionActions
    return []
  })

  const close = () => {
    expanded.value = false
  }

  const toggle = () => {
    expanded.value = !expanded.value
  }

  const run = (action: Action) => {
    expanded.value = false
    router.push(action.path)
  }

  watch(
    () => route.path,
    () => {
      expanded.value = false
    }
  )
</script>

<style lang="scss" scoped>
.fab-wrapper {
  position: fixed;
  right: 16px;
  bottom: calc(#{$navbar-height-and-margin} + env(safe-area-inset-bottom, 0px));
  z-index: 110;
  pointer-events: none;
}

.fab-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  z-index: 105;
  pointer-events: auto;
}

.fab-stack {
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
  gap: 12px;
  pointer-events: auto;
}

.fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--primary-gradient, linear-gradient(135deg, #667eea 0%, #764ba2 100%));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  font-size: 22px;
  border: none;
  -webkit-tap-highlight-color: transparent;
}

.fab:hover {
  transform: scale(1.05);
}

.fab.expanded {
  transform: rotate(45deg);
}

.mini-fab {
  height: 44px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border: none;
  cursor: pointer;
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}

.mini-fab-label {
  white-space: nowrap;
}

.fab-primary { background: linear-gradient(135deg, #007bff, #0056b3); }
.fab-warning { background: linear-gradient(135deg, #ffc107, #e0a800); color: #212529; }
.fab-info { background: linear-gradient(135deg, #17a2b8, #117a8b); }
.fab-credit { background: linear-gradient(135deg, #6f42c1, #4e2a8e); }
.fab-bien { background: linear-gradient(135deg, #e83e8c, #c42a60); }

.pop-enter-active {
  transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pop-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.pop-enter-from {
  opacity: 0;
  transform: scale(0.6) translateY(20px);
}

.pop-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(10px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
