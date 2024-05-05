<template>
  <div class="operation">
    <input
      :id="checkBoxID"
      v-model="modelValue"
      type="checkbox"
      @change="updateCheckOp"
    >
    <div
      class="label"
      :class="css.category"
    >
      <label
        :for="checkBoxID"
        :data-id="operation.IDop"
      >
        {{ operation.NomOp }}
        <br>
        {{ dateOperation }}
      </label>
    </div>
    <div
      class="montant"
      :class="css.montant"
    >
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

<script>
  import '@/styles/components/OperationsList/Operation.scss'
  import {
    checkBoxID,
    generateCssVariables,
    generateDateOperationVariables
  } from '@/helpers/components/Operation'
  import Currency from '../Currency'

  export default {
    name: 'Operation',

    components: { Currency },

    props: {
      operation: {
        type: Object,
        default: () => {}
      }
    },

    data () {
      return {
        dateOperation: generateDateOperationVariables(this.operation),
        css: generateCssVariables(this.operation),
        checkBoxID: checkBoxID(this.operation.IDop)
      }
    },

    computed: {
      modelValue: {
        get () {
          return this.operation.CheckOp
        }
      }
    },

    watch: {
      operation () {
        this.dateOperation = generateDateOperationVariables(this.operation)
        this.css = generateCssVariables(this.operation)
      }
    },

    methods: {
      updateCheckOp () {
        this.$store.dispatch('updateOperation', {
          ...this.operation,
          CheckOp: !this.operation.CheckOp
        })
      }
    }
  }
</script>
