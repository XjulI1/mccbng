<template>
  <div class="app-header">
    <div>
      <button
        class="btn btn-info search-button"
        @click="searchOperation"
      >
        <font-awesome-icon icon="search" />
      </button>
    </div>
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
    <div>
      <button
        class="btn btn-secondary chart-button"
        @click="goToStats"
      >
        <font-awesome-icon icon="chart-pie" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useStore } from 'vuex'
  import Currency from './Currency.vue'

  const route = useRoute()
  const router = useRouter()
  const store = useStore()

  const activeAccount = computed(() => store.state.compte.activeAccount)

  const disabledTotal = computed(() => {
    return route.meta.disabledTotalHeader === undefined
      ? false
      : route.meta.disabledTotalHeader
  })

  const goToStats = () => {
    store.dispatch('toggleAccountList', false)
    router.push('stats')
  }

  const searchOperation = () => {
    router.push('search')
  }
</script>

<style lang="scss" scoped>
.app-header {
  position: fixed;
  height: $header-height;
  width: fit-content;
  max-width: 90%;
  min-width: 360px;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  top: 10px;
  left: 75%;
  transform: translateX(-75%);
  text-align: center;
  padding: 10px;
  z-index: 100;
  font-size: 1.1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  gap: 1rem;
  border-radius: 14px;

  @media screen and (max-width: $mobile_BP_max_width) {
    left: 50%;
    transform: translateX(-50%);
  }

  button.chart-button,
  button.search-button {
    width: 45px;
    height: 40px;
    font-size: 1.2rem;
    line-height: 1rem;
    border-radius: 14px;
    border: none;
    backdrop-filter: blur(5px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-weight: 600;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
  }
}

.account-info {
  font-weight: 600;
  font-size: 1.05rem;
  padding: 0;
  color: #212529;
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
