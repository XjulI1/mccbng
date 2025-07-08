<template>
  <div>
    <sum-by-month />
    <pie-by-categorie />
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useStore } from "vuex";
import SumByMonth from "@/components/Stats/SumByMonth";
import PieByCategorie from "@/components/Stats/PieByCategorie";

const store = useStore();

onMounted(() => {
  store.commit("setActiveAccount", { NomCompte: "Stats" });
});
</script>
