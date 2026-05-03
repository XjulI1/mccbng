<template>
  <div class="app-header">
    <div class="account-info">
      <div>
        {{ activeAccount.NomCompte }}
      </div>
      <div :class="{ 'no-total': disabledTotal }">
        <Currency :amount="activeAccount.soldeNotChecked || 0" /> - [<Currency
          :amount="activeAccount.soldeChecked || 0"
        />]
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useRoute } from 'vue-router'
  import { useStore } from 'vuex'
  import Currency from './Currency.vue'

  const route = useRoute()
  const store = useStore()

  const activeAccount = computed(() => store.state.compte.activeAccount)

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
</style>
