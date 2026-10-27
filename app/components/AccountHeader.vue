<template>
  <header
    class="app-header"
    :class="{ 'name-only': disabledTotal }"
  >
    <div class="header-top">
      <span class="account-name">{{ activeAccount.NomCompte }}</span>
      <span
        v-if="jauge && !disabledTotal"
        class="plafond-percent"
        :class="{ over: jauge.percent >= 100 }"
      >{{ Math.floor(jauge.percent) }} %</span>
    </div>
    <div
      v-if="!disabledTotal"
      class="header-balances"
    >
      <span
        class="balance-main"
        :class="{ negative: hasBalance && soldeNotChecked < 0 }"
      >
        <Currency
          v-if="hasBalance"
          :amount="soldeNotChecked"
        />
        <template v-else>…</template>
      </span>
      <span
        v-if="hasBalance"
        class="balance-checked"
        :class="{ 'all-checked': toutPointe }"
      >
        <template v-if="toutPointe">
          <font-awesome-icon
            icon="check"
            class="balance-checked-icon"
          />
          <span class="balance-label">Tout pointé</span>
        </template>
        <template v-else>
          <span class="balance-label">Pointé</span>
          <Currency :amount="soldeChecked" />
        </template>
      </span>
    </div>
    <div
      v-if="jauge && !disabledTotal"
      class="plafond-gauge"
      role="meter"
      aria-valuemin="0"
      :aria-valuemax="plafond"
      :aria-valuenow="soldeNotChecked"
      :aria-label="plafondLabel"
      :title="plafondLabel"
    >
      <div
        class="plafond-gauge-bar"
        :class="{ over: jauge.percent >= 100 }"
        :style="{ width: jauge.largeur + '%' }"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useRoute } from '#imports'
  import { useCompteStore } from '@/stores/compte'
  import { formatEuros } from '@/utils/money'
  import { plafondJauge } from '@/utils/plafond'
  import Currency from './Currency.vue'

  const route = useRoute()
  const compteStore = useCompteStore()

  const activeAccount = computed(() => compteStore.activeAccount)

  // Avant la réponse des soldes, on affiche « … » plutôt qu'un faux 0 €
  const hasBalance = computed(() => typeof activeAccount.value.soldeNotChecked === 'number')
  const soldeNotChecked = computed(() => activeAccount.value.soldeNotChecked || 0)
  const soldeChecked = computed(() => activeAccount.value.soldeChecked || 0)
  const toutPointe = computed(() => Math.abs(soldeNotChecked.value - soldeChecked.value) < 0.005)

  // Plafond lu dans la liste des comptes : à jour dès la modification du compte
  const plafond = computed(() => compteStore.getAccount(activeAccount.value.IDcompte)?.Plafond ?? activeAccount.value.Plafond)

  const jauge = computed(() => plafondJauge(activeAccount.value.soldeNotChecked, plafond.value))

  const plafondLabel = computed(() => {
    if (!jauge.value) return ''
    const reste = jauge.value.reste >= 0
      ? `reste ${formatEuros(jauge.value.reste)}`
      : `dépassé de ${formatEuros(-jauge.value.reste)}`
    return `Plafond ${formatEuros(plafond.value)} : ${reste}`
  })

  const disabledTotal = computed(() => {
    return route.meta.disabledTotalHeader === undefined
      ? false
      : route.meta.disabledTotalHeader
  })
</script>

<style lang="scss" scoped>
.app-header {
  position: fixed;
  // Encoche de l'iPhone en PWA plein écran (viewport-fit=cover)
  top: max(10px, env(safe-area-inset-top));
  // Centré sur le panneau de droite (la liste des comptes occupe la gauche)
  left: calc(#{$left-panel-width} + (100% - #{$left-panel-width}) / 2);
  transform: translateX(-50%);
  height: $header-height;
  width: max-content;
  min-width: 300px;
  max-width: min(460px, 60%);
  padding: 8px 20px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  color: var(--text-primary);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  background-color: var(--bg-glass);
  border: var(--glass-border);
  box-shadow: var(--shadow-glass);
  border-radius: 14px;
  line-height: 1.2;

  // Mobile : bandeau sur toute la largeur, marges de 8 px
  @media screen and (max-width: $mobile_BP_max_width) {
    left: 8px;
    right: 8px;
    transform: none;
    width: auto;
    min-width: 0;
    max-width: none;
    padding: 8px 14px;
  }
}

.header-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.account-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

// Pages sans compte réel (Stats, Gestion…) : seul le titre, centré
.name-only {
  .header-top {
    justify-content: center;
  }

  .account-name {
    font-size: 1.15rem;
    color: var(--text-primary);
  }
}

.plafond-percent {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;

  &.over {
    color: var(--color-warning-dark);
  }
}

.header-balances {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  font-variant-numeric: tabular-nums;
}

.balance-main {
  font-size: 1.4rem;
  font-weight: 700;
  white-space: nowrap;
  color: var(--text-primary);

  &.negative {
    color: var(--color-danger-dark);
  }

  @media screen and (max-width: 360px) {
    font-size: 1.2rem;
  }
}

.balance-checked {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  color: var(--text-secondary);

  &.all-checked {
    flex-direction: row;
    align-items: center;
    gap: 4px;
    color: var(--color-success-dark);
  }
}

.balance-label {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;

  .all-checked & {
    color: inherit;
  }
}

.balance-checked-icon {
  font-size: 0.75rem;
}

// Jauge en bas du cartouche, dans le padding : la hauteur de l'en-tête ne change pas
.plafond-gauge {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 3px;
  height: 3px;
  background-color: var(--bg-muted, #f1f5f9);
  border-radius: 2px;
  overflow: hidden;
}

.plafond-gauge-bar {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #81c784);
  border-radius: 2px;
  transition: width 0.3s ease;

  &.over {
    background: var(--warning-gradient);
  }
}
</style>
