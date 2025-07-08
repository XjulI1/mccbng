<template>
  <div class="amortissement-view">
    <h2>
      {{ operation.NomOp }}
      <button @click="toggleSimulate">
        <font-awesome-icon icon="funnel-dollar" />
      </button>
    </h2>
    <div class="containerr">
      <div class="roww data">
        <div>Date : {{ new Date(operation.DateOp).toLocaleDateString() }}</div>
        <div>
          Prix : <span class="montant">{{ montantTotal }}€</span>
        </div>
      </div>
      <div class="roww duree">
        Durée :
        <ul>
          <li>
            {{ dureeAmortissement.year }} ans et
            {{ dureeAmortissement.yearMonth }} mois
          </li>
          <li>{{ dureeAmortissement.month }} mois</li>
        </ul>
      </div>
      <div class="roww prix">
        Prix :
        <ul>
          <li>
            <span class="montant">{{ prixAmortissement.year }}€</span> par an
          </li>
          <li>
            <span class="montant">{{ prixAmortissement.month }}€</span> par mois
          </li>
        </ul>
      </div>
    </div>
    <div v-if="simulator" class="simulator">
      <div class="title">Revente</div>
      <input
        v-model="simulatorData.prixRevente"
        type="text"
        placeholder="Prix de revente"
      />
      <input
        v-model="simulatorData.dateRevente"
        type="date"
        placeholder="Date de revente"
      />
    </div>
    <hr />
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from "vue";
const { operation } = defineProps(["operation"]);
const currentDate = computed(() =>
  simulatorData.value.dateRevente
    ? new Date(simulatorData.value.dateRevente)
    : new Date()
);
const duree = computed(() => currentDate.value - new Date(operation.DateOp));
const simulator = ref(false);
const montantTotal = computed(() =>
  Math.round(operation.MontantOp * -1 - simulatorData.value.prixRevente)
);
const MILLISECONDS_IN_YEAR = 31536000000;

const simulatorData = ref({
  prixRevente: 0,
  dateRevente: undefined,
});

function toggleSimulate() {
  simulator.value = !simulator.value;
  if (!simulator.value) {
    simulatorData.value = {
      prixRevente: 0,
      dateRevente: undefined,
    };
  }
}

const dureeAmortissement = computed(() => ({
  year: Math.floor(duree.value / MILLISECONDS_IN_YEAR),
  yearMonth:
    Math.floor(duree.value / (MILLISECONDS_IN_YEAR / 12)) -
    Math.floor(duree.value / MILLISECONDS_IN_YEAR) * 12,
  month: Math.floor(duree.value / (MILLISECONDS_IN_YEAR / 12)),
}));

const prixAmortissement = computed(() => ({
  year: Math.round(montantTotal.value / (dureeAmortissement.value.year || 1)),
  month: Math.round(montantTotal.value / (dureeAmortissement.value.month || 1)),
}));
</script>
<style lang="scss" scoped>
.amortissement-view {
  max-width: 900px;
  margin-bottom: $navbar-height-and-margin;
}

h2 {
  font-size: 1.6rem;
  margin-left: 1rem;
  margin-right: 1rem;

  button {
    background-color: transparent;
    border: none;
    cursor: pointer;
    outline: none;
    float: right;

    svg {
      width: 1.3rem;
    }
  }
}

hr {
  max-width: 70%;
}
.containerr {
  display: flex;
  justify-content: space-around;

  margin-left: 1.2rem;
  margin-right: 1.2rem;

  @media all and (min-width: $desktop_BP_min_width) {
    flex-direction: row;

    .data {
      div:first-child {
        margin-bottom: 0.5rem;
      }
    }
  }

  @media screen and (max-width: $mobile_BP_max_width) {
    flex-direction: column;
    .roww {
      display: flex;
      justify-content: space-between;
    }
    .data {
      margin-bottom: 1rem;
    }
    p,
    li {
      display: inline;
      &:first-child {
        margin-right: 0.5rem;
      }
      &:first-child::after {
        content: "/";
        margin-left: 0.5rem;
      }
    }
  }
}
.montant {
  font-weight: bold;
}
.simulator {
  display: flex;
  gap: 1.2rem;
  justify-content: center;
  .title {
    font-size: 1.2rem;
    font-weight: bold;
  }
  input[type="text"] {
    width: 60px;
  }
}
</style>
