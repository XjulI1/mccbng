<template>
  <div class="amortissement-view">
    <h2>
      {{ operation.NomOp }}
    </h2>
    <div class="containerr">
      <div class="roww data">
        <div>
          Date : {{ new Date(operation.DateOp).toLocaleDateString() }}
        </div>
        <div>
          Prix : <span class="montant">{{ operation.MontantOp * -1 }}€</span>
        </div>
      </div>
      <div class="roww duree">
        Durée :
        <ul>
          <li>
            {{ dureeAmortissement.year }} ans et {{ dureeAmortissement.yearMonth }} mois
          </li>
          <li>
            {{ dureeAmortissement.month }} mois
          </li>
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
    <hr>
  </div>
</template>
<script setup>
  const { operation } = defineProps(['operation'])
  const duree = new Date() - new Date(operation.DateOp)

  const dureeAmortissement = {
    year: Math.round(duree / 31536000000),
    yearMonth: Math.floor(duree / (31536000000 / 12)) - Math.floor(duree / 31536000000) * 12,
    month: Math.floor(duree / (31536000000 / 12))
  }

  const prixAmortissement = {
    year: Math.round(operation.MontantOp * -1 / (dureeAmortissement.year || 1)),
    month: Math.round(operation.MontantOp * -1 / (dureeAmortissement.month || 1))
  }

</script>
<style lang="scss" scoped>
  .amortissement-view {
    max-width: 900px;
  }
  h2 {
    font-size: 1.6rem;
    margin-left: 1rem;
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
      p, li {
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
</style>
