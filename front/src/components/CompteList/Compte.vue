<template>
  <div class="account-compact" :class="classPointer" @click="getAccountDetails">
    <div class="account-info">
      <div class="account-icon">
        <img
          v-if="imgID"
          class="banque-img"
          :src="`/img/banques/banque-${imgID}.png`"
        />
        <font-awesome-icon v-else-if="faIcon" :icon="faIcon" class="icon-fa" />
      </div>
      <div class="account-name" :class="classBoldTitle">
        {{ accountInformations.NomCompte }}
      </div>
    </div>
    <div class="account-amount" :class="soldeColor">
      <Currency :amount="accountInformations.soldeNotChecked || 0" />
    </div>
    <div v-if="warning" class="warning-compact" :class="soldeColor">
      <Currency
        :amount="(accountInformations.soldeNotChecked || 0) - warning"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import Currency from "../Currency.vue";

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
<style scoped>
.account-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
  min-height: 44px;
}

.account-compact:hover {
  background: #f1f5f9;
  border-color: #cbd5e0;
  transform: translateX(2px);
}

.account-compact.cursor-pointer {
  cursor: pointer;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.account-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 4px;
  flex-shrink: 0;
}

.banque-img {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.icon-fa {
  font-size: 0.75rem;
  color: #6b7280;
}

.account-name {
  font-size: 1rem;
  font-weight: 500;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-name.bold-title {
  font-weight: 700;
}

.account-amount {
  font-size: 1.05rem;
  font-weight: 600;
  text-align: right;
  flex-shrink: 0;
  min-width: fit-content;
}

.warning-compact {
  font-size: 0.85rem;
  font-weight: 500;
  text-align: right;
  flex-shrink: 0;
  margin-left: 8px;
  opacity: 0.8;
}

.soldeIn {
  color: #10b981;
}

.soldeWarning {
  color: #f59e0b;
}

.soldeOut {
  color: #ef4444;
}

@media (max-width: 768px) {
  .account-compact {
    padding: 6px 10px;
    min-height: 40px;
  }

  .account-icon {
    width: 18px;
    height: 18px;
  }

  .banque-img {
    width: 14px;
    height: 14px;
  }
}
</style>
