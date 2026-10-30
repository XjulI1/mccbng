<template>
  <div class="fab-wrapper">
    <Teleport to="body">
      <transition name="fade">
        <div
          v-if="expanded"
          class="fab-backdrop"
          @click="close"
        />
      </transition>
    </Teleport>

    <transition-group
      v-if="expanded"
      name="pop"
      tag="div"
      class="mini-fabs"
    >
      <button
        v-for="action in actions"
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
      :class="{ expanded, minimized }"
      :disabled="actions.length === 0"
      :aria-label="actions.length === 0
        ? 'Aucune action disponible'
        : (expanded ? 'Fermer le menu' : 'Ouvrir le menu d\'actions')"
      :aria-expanded="expanded"
      @click="toggle"
    >
      <font-awesome-icon
        class="fab-icon"
        icon="plus"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from '#imports'
  import { fetchImportDisponible } from '@/services/imports'

  type Action = {
    label: string
    icon: string
    color: string
    path: string
  }

  defineProps<{ minimized?: boolean }>()

  const route = useRoute()
  const router = useRouter()
  const expanded = ref(false)

  const homeActions: Action[] = [
    { label: 'Nouvelle opération', icon: 'plus', color: 'fab-primary', path: '/newOperation' },
    { label: 'Virement', icon: 'exchange-alt', color: 'fab-warning', path: '/transfert' }
  ]
  const importAction: Action = { label: 'Importer', icon: 'file-import', color: 'fab-info', path: '/import' }

  // Import par IA proposé seulement si le serveur a une clé Anthropic
  const importDisponible = ref(false)
  onMounted(() => {
    fetchImportDisponible().then((disponible) => { importDisponible.value = disponible }).catch(() => {})
  })

  const gestionActions: Action[] = [
    { label: 'Nouveau compte', icon: 'wallet', color: 'fab-compte', path: '/newCompte' },
    { label: 'Nouvelle récurrente', icon: 'retweet', color: 'fab-info', path: '/newRecurrOperation' },
    { label: 'Nouveau crédit', icon: 'credit-card', color: 'fab-credit', path: '/newCredit' },
    { label: 'Nouveau bien', icon: 'home', color: 'fab-bien', path: '/newBien' }
  ]

  const isHomeContext = (path: string) =>
    path === '/' ||
    path === '/operations' ||
    path === '/newOperation' ||
    path.startsWith('/editOperation') ||
    path === '/search' ||
    path === '/transfert' ||
    path === '/retrait' ||
    path === '/import'

  const isGestionContext = (path: string) =>
    path === '/gestion' ||
    path === '/credits' ||
    path === '/biens' ||
    path === '/recurrOperation' ||
    path === '/amortissement' ||
    path === '/comptesGestion' ||
    path === '/newRecurrOperation' ||
    path.startsWith('/editRecurrOperation') ||
    path === '/newCredit' ||
    path.startsWith('/editCredit') ||
    path === '/newBien' ||
    path.startsWith('/editBien') ||
    path === '/newCompte' ||
    path.startsWith('/editCompte')

  const actions = computed<Action[]>(() => {
    if (isHomeContext(route.path)) return importDisponible.value ? [...homeActions, importAction] : homeActions
    if (isGestionContext(route.path)) return gestionActions
    return []
  })

  const close = () => {
    expanded.value = false
  }

  const toggle = () => {
    if (actions.value.length === 0) return
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
// Emplacement de largeur fixe : le bouton s'y réduit centré sans élargir la tab bar voisine.
.fab-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  width: $navbar-height;
  flex-shrink: 0;
}

.fab-backdrop {
  position: fixed;
  inset: 0;
  background: transparent;
  z-index: 90;
}

.mini-fabs {
  position: absolute;
  right: 0;
  bottom: calc(100% + 12px);
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
  gap: 12px;
}

.fab {
  @include liquid-glass;
  flex-shrink: 0;
  width: $navbar-height;
  height: $navbar-height;
  border-radius: 50%;
  color: var(--text-primary, #2d3748);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform 0.3s $spring-fallback,
    width 0.4s $spring-fallback,
    height 0.4s $spring-fallback;
  transition:
    transform 0.3s $spring,
    width 0.4s $spring,
    height 0.4s $spring;
  font-size: 22px;
  -webkit-tap-highlight-color: transparent;
}

// Repliée au défilement avec la tab bar
.fab.minimized {
  width: $navbar-height-minimized;
  height: $navbar-height-minimized;
}

.fab:not(:disabled):hover {
  transform: scale(1.05);
}

.fab:not(:disabled):active {
  transform: scale(1.1);
}

// Seule l'icône tourne : le reflet du verre reste en place.
.fab-icon {
  transform-origin: center;
  transition:
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    scale 0.4s $spring-fallback;
  transition:
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    scale 0.4s $spring;
}

// `scale` plutôt que `transform` : se cumule avec la rotation du menu ouvert.
.fab.minimized .fab-icon {
  scale: 0.82;
}

.fab.expanded {
  color: #667eea;
}

.fab.expanded .fab-icon {
  transform: rotate(45deg);
}

@media (prefers-reduced-motion: reduce) {
  .fab,
  .fab-icon {
    transition: none;
  }
}

.fab:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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
.fab-compte { background: linear-gradient(135deg, #f59e0b, #d97706); }

.pop-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pop-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
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
