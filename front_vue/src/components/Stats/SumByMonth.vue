<template>
  <div class="sum-by-month">
    <div class="selector-date">
      Mois :
      <select v-model="currentMonth">
        <option v-for="month in listMonth" v-bind:key="'month-' + month" :value="month+1">{{month+1}}
        </option>
      </select>

      Année :
      <select v-model="currentYear">
        <option v-for="year in listYear" v-bind:key="'year-' + year" :value="year">{{year}}
        </option>
      </select>
    </div>

    <div class="total-month">
      Total ce mois : <b>{{$store.state.stats.negativeMonth}}{{$store.state.currency}}</b>
    </div>

    <div v-for="(accountTotal, IDcompte) in $store.state.stats.negativeByAccount" v-bind:key="IDcompte"
         v-if="accountTotal">
      {{$store.getters.getAccountName(IDcompte)[0].NomCompte}} :
      <b>{{accountTotal}} {{$store.state.currency}}</b>
      <div class="parjour">
        par jour :
        {{Math.round(accountTotal / numberDaysForCurrentMonth() * 100) / 100}} {{$store.state.currency}}
      </div>
    </div>
  </div>
</template>

<script>
  import { mapGetters } from 'vuex'

  export default {
    name: 'SumByMonth',

    computed: {
      ...mapGetters(['availableCompte']),

      currentYear: {
        get () {
          return this.$store.state.stats.currentYear
        },
        set (value) {
          this.$store.dispatch('changeStatsCurrentYear', value)
        }
      },

      currentMonth: {
        get () {
          return this.$store.state.stats.currentMonth
        },
        set (value) {
          this.$store.dispatch('changeStatsCurrentMonth', value)
        }
      }
    },

    watch: {
      availableCompte () {
        this.$store.dispatch('fetchSumByUserByMonth')
      }
    },

    data () {
      return {
        listMonth: [...Array(12).keys()],
        listYear: [2017, 2018, 2019, 2020]
      }
    },

    created () {
      if (this.$store.state.user.id) {
        this.$store.dispatch('fetchSumByUserByMonth')
      }
    },

    methods: {
      numberDaysForCurrentMonth () {
        const currentDate = new Date()

        if (this.currentYear === currentDate.getFullYear() && this.currentMonth === currentDate.getMonth() + 1) {
          return (new Date()).getDate() * -1
        }

        return new Date(this.currentYear, this.currentMonth, 0).getDate()
      }
    }
  }
</script>

<style scoped>

  .sum-by-month {
    margin-left: 10px;
    margin-right: 10px;
  }

  .parjour {
    margin-left: 4%;
    margin-bottom: 10px;
  }

  .selector-date {
    text-align: center;
    margin-bottom: 10px;
  }

  .total-month {
    text-align: center;
    margin-bottom: 20px;
  }
</style>
