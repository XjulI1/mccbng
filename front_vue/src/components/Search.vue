<template>
  <div>
    <input ref="search-input" id="search-input" type="text" class="form-control" placeholder="Search terms"
           v-model="searchTerms"
           @keyup="search"/>
  </div>
</template>

<script>
  export default {
    name: 'Search',

    data () {
      return {
        searchTerms: '',
        timer: null
      }
    },

    mounted () {
      this.$refs['search-input'].focus()
    },

    methods: {
      search () {
        if (this.timer) {
          clearTimeout(this.timer)
          this.timer = null
        }
        this.timer = setTimeout(() => {
          this.$store.dispatch('getSearchOperations', this.searchTerms)
        }, 200)
      }
    }
  }
</script>
