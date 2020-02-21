<template>
  <div class="navbar btn-group" role="group">
    <all-account-button/>
    <virement-button/>
    <new-operation-button/>
    <operation-recurrente-button/>
    <params-button/>
  </div>
</template>

<script>
  import NewOperationButton from './NavBar/NewOperationButton'
  import VirementButton from './NavBar/VirementButton'
  import ParamsButton from './NavBar/ParamsButton'
  import AllAccountButton from './NavBar/AllAccountButton'
  import OperationRecurrenteButton from './NavBar/OperationRecurrenteButton'

  export default {
    name: 'navbar',
    components: { OperationRecurrenteButton, AllAccountButton, ParamsButton, VirementButton, NewOperationButton }
  }
</script>

<style lang="scss" scoped>
  @import '@/global.scss';

  .navbar {
    padding: 0;

    height: $navbar-height;
    width: 35%;
    background-color: white;
    position: fixed;
    bottom: 0;
    left: 0;
    display: inline;
    text-align: center;
    z-index: 100;

    @media screen and (max-width: 768px) {
      width: 100%;
    }
  }
</style>
