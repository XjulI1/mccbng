<template>
  <div class="operation">
    <input
      :id="checkBoxID"
      v-model="operation.CheckOp"
      type="checkbox"
      @change="updateCheckOp"
    >
    <draggable
      v-if="draggableActif"
      class="label"
      :class="css.category"
      :group="{ name: 'operation', pull: 'clone', put: ['false'] }"
      :data-idcat="operation.IDcat"
      @start="startDrag"
      @end="endDrag"
    >
      <label
        :for="checkBoxID"
        :data-id="operation.IDop"
      >
        {{ operation.NomOp }}
        <br>
        {{ dateOperation }}
      </label>
    </draggable>
    <div
      v-else
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
  import draggable from 'vuedraggable'

  import '@/styles/components/OperationsList/Operation.scss'
  import {
    checkBoxID,
    generateCssVariables,
    generateDateOperationVariables
  } from '@/helpers/components/Operation'
  import Currency from '../Currency'

  export default {
    name: 'Operation',

    components: { Currency, draggable },

    props: {
      operation: {
        type: Object,
        default: () => {}
      },
      draggableActif: {
        type: Boolean,
        default: false
      }
    },

    data () {
      return {
        dateOperation: generateDateOperationVariables(this.operation),
        css: generateCssVariables(this.operation),
        checkBoxID: checkBoxID(this.operation.IDop)
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
        this.$store.dispatch('updateOperation', this.operation)
      },

      startDrag (event) {
        this.$store.dispatch('toggleCategoriesDropZone')
        this.$store.dispatch(
          'actualDragCategory',
          event.srcElement.dataset.idcat
        )
      },

      endDrag () {
        this.$store.dispatch('toggleCategoriesDropZone')
      }
    }
  }
</script>
