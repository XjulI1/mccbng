<template>
  <div>
    <sum-by-month />
    <pie-by-categorie />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useStore } from "vuex";
import SumByMonth from "@/components/Stats/SumByMonth.vue";
import PieByCategorie from "@/components/Stats/PieByCategorie.vue";

const store = useStore();

onMounted(() => {
  store.commit("setActiveAccount", { NomCompte: "Stats" });
});
</script>
