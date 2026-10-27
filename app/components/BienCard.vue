<template>
  <div
    class="bien-card"
    @click="editBien"
  >
    <div class="bien-card-header">
      <h3 class="bien-name">
        {{ bien.NomBien }}
      </h3>
      <span class="bien-type">
        {{ typeLabel }}
      </span>
    </div>

    <div class="bien-card-body">
      <div class="bien-info">
        <font-awesome-icon
          icon="map-marker-alt"
          class="icon"
        />
        <span>{{ bien.Ville }}</span>
        <span
          v-if="bien.Surface"
          class="bien-surface"
        >· {{ bien.Surface }} m²</span>
      </div>

      <div class="bien-info">
        <font-awesome-icon
          icon="home"
          class="icon"
        />
        <span>{{ usageLabel }}</span>
      </div>

      <div class="bien-info">
        <font-awesome-icon
          icon="calendar"
          class="icon"
        />
        <span>Acheté le {{ formatDate(bien.DateAchat) }}</span>
      </div>

      <div class="bien-amounts">
        <div class="amount-item">
          <span class="label">Prix total</span>
          <span class="value">{{ formatEuros(prixTotal) }}</span>
        </div>
        <div
          v-if="bien.ValeurActuelle"
          class="amount-item"
        >
          <span class="label">Valeur actuelle</span>
          <span
            class="value"
            :class="plusValueClass"
          >{{ formatEuros(bien.ValeurActuelle) }}</span>
        </div>
      </div>

      <div
        v-if="rentalBlock"
        class="bien-amounts"
      >
        <div class="amount-item">
          <span class="label">{{ rentalBlock.prevu ? 'Loyer prévu' : `Loyer moyen depuis ${rentalBlock.depuis}` }}</span>
          <span class="value montant-positif">{{ rentalBlock.loyer }}</span>
        </div>
      </div>

      <div
        v-if="bilanBlock"
        class="bien-bilan"
      >
        <span class="bien-bilan-title">Bilan depuis l'achat</span>
        <div
          v-for="ligne in bilanBlock.lignes"
          :key="ligne.label"
          class="bien-bilan-row"
        >
          <span class="label">{{ ligne.label }}</span>
          <span :class="ligne.classe">{{ ligne.montant }}</span>
        </div>
        <div class="bien-bilan-row bien-bilan-total">
          <span>{{ bilanBlock.gainTotal.label }}</span>
          <span :class="bilanBlock.gainTotal.classe">{{ bilanBlock.gainTotal.montant }}</span>
        </div>
        <span
          v-if="bilanBlock.partCreditLoyers"
          class="label"
        >{{ bilanBlock.partCreditLoyers }}</span>
      </div>

      <div
        v-if="associatedCredit"
        class="bien-info"
      >
        <font-awesome-icon
          icon="credit-card"
          class="icon"
        />
        <span>Crédit : {{ associatedCredit.NomCredit }}</span>
      </div>

      <div
        v-if="bien.ApportCash"
        class="bien-info"
      >
        <font-awesome-icon
          icon="wallet"
          class="icon"
        />
        <span>Apport : {{ formatEuros(bien.ApportCash) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useRouter } from '#imports'
  import { useBienStore } from '@/stores/bien'
  import { useCreditStore } from '@/stores/credit'
  import { bienBilanBlock, bienRentalBlock } from '@/utils/rentabilite'
  import { formatEuros } from '@/utils/money'

  const props = defineProps({
    bien: {
      type: Object,
      required: true
    }
  })

  const router = useRouter()
  const bienStore = useBienStore()
  const creditStore = useCreditStore()

  const prixTotal = computed(() => {
    return (
      (props.bien.PrixBienNu || 0) +
      (props.bien.FraisNotaire || 0) +
      (props.bien.FraisAgence || 0)
    )
  })

  const rentalBlock = computed(() =>
    props.bien.Usage === 'locatif' ? bienRentalBlock(bienStore.bienRentabilites[props.bien.IDbien]) : null
  )

  const bilanBlock = computed(() =>
    props.bien.Usage === 'locatif'
      ? bienBilanBlock(bienStore.bienRentabilites[props.bien.IDbien]?.bilan, Boolean(props.bien.ValeurActuelle))
      : null
  )

  const associatedCredit = computed(() => {
    if (!props.bien.IDcredit) return null
    return creditStore.creditList?.find(
      (c) => c.IDcredit === props.bien.IDcredit
    )
  })

  const typeLabel = computed(() => {
    const labels = {
      appartement: 'Appartement',
      maison: 'Maison',
      terrain: 'Terrain',
      parking: 'Parking',
      local: 'Local commercial'
    }
    return labels[props.bien.TypeBien] || props.bien.TypeBien
  })

  const usageLabel = computed(() => {
    const labels = {
      principale: 'Résidence principale',
      secondaire: 'Résidence secondaire',
      locatif: 'Locatif'
    }
    return labels[props.bien.Usage] || props.bien.Usage
  })

  const plusValueClass = computed(() => {
    if (!props.bien.ValeurActuelle) return ''
    if (props.bien.ValeurActuelle > prixTotal.value) return 'montant-positif'
    if (props.bien.ValeurActuelle < prixTotal.value) return 'montant-negatif'
    return ''
  })

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
  }

  const editBien = () => {
    router.push(`/editBien/${props.bien.IDbien}`)
  }
</script>

<style scoped>
.bien-card {
  background: var(--bg-card, #ffffff);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color, #e0e0e0);
}

.bien-card:hover {
  box-shadow: var(--shadow-lg, 0 10px 15px rgba(0, 0, 0, 0.1));
  transform: translateY(-2px);
}

.bien-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.bien-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #333);
  margin: 0;
}

.bien-type {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  background-color: #ede7f6;
  color: #5e35b1;
}

.bien-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bien-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary, #666);
  font-size: 0.95rem;
}

.bien-surface {
  margin-left: 0.25rem;
}

.bien-amounts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 0.75rem 0;
  border-top: 1px dashed var(--border-color, #e0e0e0);
  border-bottom: 1px dashed var(--border-color, #e0e0e0);
}

.amount-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.amount-item .label {
  font-size: 0.875rem;
  color: var(--text-secondary, #666);
}

.amount-item .value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.montant-positif {
  color: var(--color-success, #4caf50);
}

.bien-bilan {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.75rem 0;
  border-bottom: 1px dashed var(--border-color, #e0e0e0);
}

.bien-bilan-title {
  font-weight: 600;
  color: var(--text-primary, #333);
}

.bien-bilan-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.95rem;
}

.bien-bilan .label {
  font-size: 0.875rem;
  color: var(--text-secondary, #666);
}

.bien-bilan-total {
  padding-top: 0.375rem;
  border-top: 1px solid var(--border-color, #e0e0e0);
  font-weight: 600;
  color: var(--text-primary, #333);
}

.montant-negatif {
  color: var(--color-danger, #d32f2f);
}

.icon {
  width: 1rem;
  height: 1rem;
}

@media (max-width: 768px) {
  .bien-card {
    padding: 1rem;
  }

  .bien-name {
    font-size: 1.125rem;
  }

  .bien-amounts {
    grid-template-columns: 1fr;
  }
}
</style>
