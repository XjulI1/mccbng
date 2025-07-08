<template>
  <div>
    <TimeSeriesEvolutionSoldes />
    <SumByMonth />
    <PieByCategorie />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useStore } from "vuex";
import SumByMonth from "@/components/Stats/SumByMonth.vue";
import PieByCategorie from "@/components/Stats/PieByCategorie.vue";
import TimeSeriesEvolutionSoldes from "@/components/Stats/TimeSeriesEvolutionSoldes.vue";

const store = useStore();

onMounted(() => {
  store.commit("setActiveAccount", { NomCompte: "Stats" });
});
</script>
