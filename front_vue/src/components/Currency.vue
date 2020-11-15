<template>
  <span
    class="currency"
    :class="{ 'mask' : mask }"
  >
    {{ amount.toLocaleString() }} {{ currency }}
  </span>
</template>

<script>
  import { mapState } from 'vuex'

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
