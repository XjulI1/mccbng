<template>
  <div>
    <sum-by-month />
    <pie-by-categorie />
  </div>
</template>

<script>
  import SumByMonth from '@/components/Stats/SumByMonth'
  import PieByCategorie from '@/components/Stats/PieByCategorie'

  export default {
    name: 'Stats',
    components: { PieByCategorie, SumByMonth },
    created () {
      this.$store.commit('setActiveAccount', { NomCompte: 'Stats' })
    }
  }
</script>
