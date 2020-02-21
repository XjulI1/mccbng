<template>
  <route-over-the-content component-name="operation-form" :params="params"/>
</template>

<script>
  import RouteOverTheContent from '@/components/RouteOverTheContent'

  export default {
    name: 'EditOperation',
    components: { RouteOverTheContent },

    data () {
      return {
        params: {
          operation: this.$store.getters.operationFromCurrentList(this.$route.params.id)
        }
      }
    }
  }
</script>
