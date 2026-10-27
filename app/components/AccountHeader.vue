<template>
  <div class="app-header">
    <div class="account-info">
      <div>
        {{ activeAccount.NomCompte }}
        <span
          v-if="jauge && !disabledTotal"
          class="plafond-percent"
        >{{ Math.floor(jauge.percent) }} %</span>
      </div>
      <div :class="{ 'no-total': disabledTotal }">
        <Currency :amount="activeAccount.soldeNotChecked || 0" /> - [<Currency
          :amount="activeAccount.soldeChecked || 0"
        />]
      </div>
    </div>
    <div
      v-if="jauge && !disabledTotal"
      class="plafond-gauge"
      role="meter"
      aria-valuemin="0"
      :aria-valuemax="plafond"
      :aria-valuenow="activeAccount.soldeNotChecked || 0"
      :aria-label="plafondLabel"
      :title="plafondLabel"
    >
      <div
        class="plafond-gauge-bar"
        :style="{ width: jauge.largeur + '%' }"
      />
    </div>
  </div>
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
  height: $header-height;
  width: fit-content;
  max-width: 90%;
  min-width: 240px;
  backdrop-filter: var(--glass-blur);
  background-color: var(--bg-glass);
  border: var(--glass-border);
  top: 10px;
  left: 75%;
  transform: translateX(-75%);
  text-align: center;
  padding: 10px 24px;
  z-index: 100;
  font-size: 1.1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: var(--shadow-glass);
  border-radius: 14px;

  @media screen and (max-width: $mobile_BP_max_width) {
    left: 50%;
    transform: translateX(-50%);
  }
}

.account-info {
  font-weight: 600;
  font-size: 1.05rem;
  padding: 0;
  color: var(--text-primary);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  div:first-child {
    margin-bottom: 2px;
    font-size: 1.1rem;
  }

  div:last-child {
    font-size: 0.95rem;
    opacity: 0.9;
  }
}

.no-total {
  display: none;
}

// Sur la ligne du nom : la ligne du solde occupe déjà toute la largeur sur mobile
.plafond-percent {
  margin-left: 6px;
  white-space: nowrap;
  font-size: 0.8rem;
  opacity: 0.8;
}

// Jauge en bas du cartouche, dans le padding : la hauteur de l'en-tête ne change pas
.plafond-gauge {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 5px;
  height: 4px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 2px;
  overflow: hidden;
}

.plafond-gauge-bar {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #81c784);
  border-radius: 2px;
  transition: width 0.3s ease;
}
</style>
