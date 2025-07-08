<template>
  <div
    class="account-informations"
    :class="classPointer"
    @click="getAccountDetails"
  >
    <div class="account-name" :class="classBoldTitle">
      <img
        v-if="imgID"
        class="banque-img"
        :src="`/img/banques/banque-${imgID}.png`"
      />
      <font-awesome-icon v-else-if="faIcon" :icon="faIcon" class="icon-fa" />
      {{ accountInformations.NomCompte }}
    </div>
    <div class="account-solde" :class="soldeColor">
      <Currency :amount="accountInformations.soldeNotChecked || 0" />
    </div>
    <div v-if="warning" class="warning-infos" :class="soldeColor">
      <Currency
        :amount="(accountInformations.soldeNotChecked || 0) - warning"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import Currency from "../Currency";

const props = defineProps([
  "accountInformations",
  "boldTitle",
  "disableClick",
  "noColor",
  "warning",
  "faIcon",
]);

const route = useRoute();
const router = useRouter();
const store = useStore();

const getSoldeColor = () => {
  if (props.noColor) {
    return "";
  }

  if (props.accountInformations.soldeNotChecked < props.warning) {
    return "soldeWarning";
  }

  return props.accountInformations.soldeNotChecked >= 0
    ? "soldeIn"
    : "soldeOut";
};

const soldeColor = ref(getSoldeColor());
const classBoldTitle = computed(() => (props.boldTitle ? "bold-title" : ""));
const classPointer = computed(() =>
  props.disableClick ? "" : "cursor-pointer"
);

const imgID = computed(() => {
  return props.accountInformations.banque
    ? props.accountInformations.banque.IDbanque
    : 0;
});

watch(
  () => props.accountInformations.soldeNotChecked,
  () => {
    soldeColor.value = getSoldeColor();
  }
);

const getAccountDetails = () => {
  if (!props.disableClick) {
    if (route.path !== "/") {
      router.push("/");
    }

    store.dispatch("fetchActiveAccount", props.accountInformations.IDcompte);
    store.dispatch("toggleAccountList", false);
  }
};
</script>
<style lang="scss" scoped>
.account-informations {
  padding-top: 5px;
  padding-bottom: 5px;

  display: flex;
  flex-wrap: wrap;

  &.cursor-pointer {
    cursor: pointer;
  }

  .account-name {
    flex-grow: 1;
    padding-left: 10px;
    padding-right: 10px;

    svg {
      margin-right: 5px;
    }
  }

  .account-solde {
    text-align: right;
    padding-left: 10px;
    padding-right: 10px;
  }

  .bold-title {
    font-weight: bold;
  }

  .soldeIn {
    color: green;
  }

  .soldeWarning {
    color: orange;
  }

  .soldeOut {
    color: red;
    font-weight: bold;
  }

  .warning-infos {
    width: 100%;
    text-align: right;
    font-size: 0.7rem;
    font-weight: bold;
    padding-right: 10px;
  }

  .col-8 {
    padding-left: 10px;
  }

  .col-4,
  .col-12 {
    padding: 0 10px 0 0;
  }

  .icon-fa {
    font-size: 0.7rem;
    color: grey;
    margin-bottom: 0.1rem;
  }
}

.banque-img {
  width: 20px;
  vertical-align: text-bottom;
}
</style>
