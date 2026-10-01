<template>
  <span
    class="currency"
    :class="{ mask: mask }"
  >
    {{ formatAmount(amount) }} {{ currency }}
  </span>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useCompteStore } from '@/stores/compte'
  import { useUserStore } from '@/stores/user'

  defineProps({
    amount: {
      type: Number,
      default: null
    }
  })

  const compteStore = useCompteStore()
  const userStore = useUserStore()

  function formatAmount (amount) {
    return amount?.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const currency = computed(() => compteStore.currency)
  const mask = computed(() => userStore.maskAmount)
</script>

<style lang="scss" scoped>
.currency {
  &.mask {
    filter: blur(5px);
  }
}
</style>
