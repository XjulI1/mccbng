<template>
  <div class="new-version">
    <a href="/">
      Nouvelle version dispo
    </a>
  </div>
</template>

<script>
  export default {
    name: 'NewVersion',
    data () {
      return {}
    },

    created () {
    },

    methods: {}
  }
</script>

<style lang="scss" scoped>
  .new-version {
    display: none;
    position: fixed;
    bottom: 10px;
    left: calc(50% - 100px);
    z-index: 1000;
    width: 200px;
    text-align: center;
    background-color: whitesmoke;
    -moz-box-shadow: 3px 3px 10px 5px #cfcfcf;
    -webkit-box-shadow: 3px 3px 10px 5px #cfcfcf;
    -o-box-shadow: 3px 3px 10px 5px #cfcfcf;
    box-shadow: 3px 3px 10px 5px #cfcfcf;
    filter: progid:DXImageTransform.Microsoft.Shadow(color=#cfcfcf, Direction=135, Strength=10);
    -moz-border-radius: 4px;
    -webkit-border-radius: 4px;
    border-radius: 4px;
  }
</style>
