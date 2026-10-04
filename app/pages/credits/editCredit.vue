<template>
  <RouteOverTheContent />
</template>

<script setup lang="ts">
  import { definePageMeta } from '#imports'
  import RouteOverTheContent from '@/components/RouteOverTheContent.vue'

  definePageMeta({
    name: 'Edition crédit',
    path: '/editCredit/:id',
    componentName: 'credit-form'
  })
</script>
