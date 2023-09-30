<template>
  <span
    class="currency"
    :class="{ 'mask' : mask }"
  >
    {{ formatAmount(amount) }} {{ currency }}
  </span>
</template>

<script>
  import { mapState } from 'vuex'
  import { formatAmount } from '@/helpers/format'

  export default {
    name: 'Currency',

    props: {
      amount: {
        type: Number,
        default: null
      }
    },

    computed: {
      ...mapState({
        currency: state => state.compte.currency,
        mask: state => state.user.maskAmount
      })
    },

    methods: {
      formatAmount
    }
  }
</script>

<style lang="scss" scoped>
.currency {
  &.mask {
    filter: blur(5px);
  }
}
</style>
