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
  import { useStore } from 'vuex'
  import { formatAmount } from '@/helpers/format'

  defineProps({
    amount: {
      type: Number,
      default: null
    }
  })

  const store = useStore()

  const currency = computed(() => store.state.compte.currency)
  const mask = computed(() => store.state.user.maskAmount)
</script>

<style lang="scss" scoped>
.currency {
  &.mask {
    filter: blur(5px);
  }
}
</style>
