<template>
  <div class="home">
    <NuxtPage />
    <OperationList :OperationRenderer="OperationRenderer" />
  </div>
</template>

<script setup lang="ts">
  import { definePageMeta } from '#imports'
  import { NuxtPage } from '#components'
  import OperationList from '../components/OperationList.vue'
  import OperationRenderer from '../components/Home/Operation.vue'

  definePageMeta({
    name: 'Home'
  })
</script>

<style lang="scss" scoped>
.home {
  margin-bottom: $navbar-height-and-margin;
}

@media screen and (min-width: $desktop_BP_min_width) {
  .home {
    display: flex;
  }
}
</style>
