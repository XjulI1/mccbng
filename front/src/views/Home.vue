<template>
  <div class="home">
    <router-view />
    <OperationList :OperationRenderer="OperationRenderer" />
  </div>
</template>

<script setup lang="ts">
  import OperationList from '../components/OperationList.vue'
  import OperationRenderer from '../components/Home/Operation.vue'
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
