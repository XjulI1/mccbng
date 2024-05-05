<template>
  <div class="home">
    <router-view />
    <OperationList />
  </div>
</template>

<script setup>
  import OperationList from '../components/OperationList.vue'
</script>

<style lang="scss" scoped>
@media screen and (max-width: 767px) {
  .home {
    margin-bottom: $navbar-height;
  }
}

@media screen and (min-width: 768px) {
  .home {
    display: flex;
  }
}
</style>
