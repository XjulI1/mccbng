<template>
  <div class="route-other-the-content" @click="returnToHome">
    <div class="component-content">
      <h3 class="title">
        {{ $route.name }}
      </h3>
      <component :is="components[componentName]" v-bind="{ ...params, cash }" />
      <div v-if="invertButton" class="btn-invert">
        <button class="btn btn-sm btn-warning" @click="invertTransfert">
          {{ invertButton }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import OperationForm from "@/components/OperationForm";
import Search from "@/components/Search";
import TransfertForm from "@/components/TransfertForm";

const components = {
  "operation-form": OperationForm,
  search: Search,
  "transfert-form": TransfertForm,
};

const props = defineProps({
  componentName: {
    type: String,
    default: "",
  },
});

const route = useRoute();
const router = useRouter();

const params = {
  operationID: route.params.id,
};

const invertButton = computed(() => {
  switch (route.name) {
    case "Retrait":
      return "Virement";
    case "Virement":
      return "Retrait";
    default:
      return undefined;
  }
});

const cash = computed(() => {
  return route.name.includes("Retrait");
});

const returnToHome = (event) => {
  if (event.target.className === "route-other-the-content") {
    router.push("/");
  }
};

const invertTransfert = () => {
  switch (route.name) {
    case "Retrait":
      return router.push("/transfert");
    case "Virement":
      return router.push("/retrait");
    default:
      return undefined;
  }
};
</script>

<style lang="scss" scoped>
.route-other-the-content {
  background-color: rgba(0, 0, 0, 0.5);
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 1000;
  position: fixed;
}

.title {
  text-align: center;
}

.component-content {
  margin: ($header-height + 5px) auto auto;
  max-width: 600px;
  background-color: rgba(255, 255, 255, 0.95);
  padding: 1rem;
  border-radius: 4px;
}

.btn-invert {
  text-align: right;
}
</style>
