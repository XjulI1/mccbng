<template>
  <div class="operation">
    <input
      :id="checkBoxIDValue"
      v-model="modelValue"
      type="checkbox"
      @change="updateCheckOp"
    />
    <div class="label" :class="css.category">
      <label :for="checkBoxIDValue" :data-id="operation.IDop">
        {{ operation.NomOp }}
        <br />
        {{ dateOperation }}
      </label>
    </div>
    <div class="montant" :class="css.montant">
      <Currency :amount="operation.MontantOp" />
    </div>
    <div>
      <router-link
        :to="'/editOperation/' + operation.IDop"
        class="edit-operation"
      >
        ...
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useStore } from "vuex";
import {
  checkBoxID,
  generateCssVariables,
  generateDateOperationVariables,
} from "@/helpers/components/Operation";
import Currency from "../Currency";

const props = defineProps({
  operation: {
    type: Object,
    default: () => {},
  },
});

const store = useStore();

const dateOperation = ref(generateDateOperationVariables(props.operation));
const css = ref(generateCssVariables(props.operation));
const checkBoxIDValue = checkBoxID(props.operation.IDop);

const modelValue = computed(() => {
  return props.operation.CheckOp;
});

watch(
  () => props.operation,
  () => {
    dateOperation.value = generateDateOperationVariables(props.operation);
    css.value = generateCssVariables(props.operation);
  }
);

const updateCheckOp = () => {
  store.dispatch("updateOperation", {
    ...props.operation,
    CheckOp: !props.operation.CheckOp,
  });
};
</script>

<style lang="scss" scoped>
.operation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  padding-left: 10px;
  padding-right: 10px;

  @media all and (min-width: $desktop_BP_min_width) {
    max-width: 600px;
  }

  @media screen and (max-width: $mobile_BP_max_width) {
    max-width: 768px;
    height: 80px;
  }

  input[type="checkbox"] {
    margin-right: 10px;
  }

  .label {
    flex-grow: 2;
  }

  .montant {
    min-width: 90px;
    padding-right: 15px;
    text-align: right;

    &.montantIn {
      color: green;
    }

    &.montantOut {
      color: red;
    }
  }

  .noCategory {
    color: grey;
  }

  .edit-operation {
    text-decoration: none;
  }
}
</style>
