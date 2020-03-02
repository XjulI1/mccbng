<template>
  <div class="home">
    <router-view/>
    <operation-list/>
  </div>
</template>

<script>
  import OperationList from '../components/OperationList'

  export default {
    name: 'Home',
    components: { OperationList }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
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
