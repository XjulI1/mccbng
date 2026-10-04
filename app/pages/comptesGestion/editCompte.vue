<template>
  <RouteOverTheContent />
</template>

<script setup lang="ts">
  import { definePageMeta } from '#imports'
  import RouteOverTheContent from '@/components/RouteOverTheContent.vue'

  definePageMeta({
    name: 'Edition compte',
    path: '/editCompte/:id',
    componentName: 'compte-form'
  })
</script>
