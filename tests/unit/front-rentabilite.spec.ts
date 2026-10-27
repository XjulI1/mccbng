import { describe, expect, it } from 'vitest'
import {
  bienBilanBlock, bienRentalBlock, creditRentalLine, type BienBilan, type BienRentabilite, type CreditRentabilite
} from '../../app/utils/rentabilite'

const spaces = (text: string) => text.replace(/\s/g, ' ').replace(/\u2212/g, '-')
const lineText = (rentabilite: CreditRentabilite) => {
  const line = creditRentalLine(rentabilite)
  return line && { ...line, text: spaces(line.parts.join(' · ')) }
}

const credit = (extra: Partial<CreditRentabilite> = {}): CreditRentabilite => ({
  bien: 1,
  periode: { debut: '2021-08', mois: 62 },
  loyers: 40300,
  loyerMensuelMoyen: 650,
  mensualiteMoyenne: 830,
  cashFlowMensuel: -180,
  tauxCouverture: 78.31,
  attendu: { loyerMensuel: 650, mensualite: 830, cashFlowMensuel: -180, tauxCouverture: 78.31 },
  cumul: { loyers: 7800 },
  ...extra
})

const bien = (extra: Partial<BienRentabilite> = {}): BienRentabilite => ({
  periode: { debut: '2021-08', mois: 62 },
  loyerMensuelMoyen: 650,
  attendu: { loyerMensuel: 650 },
  bilan: { plusValue: 0, loyersNets: 6960, interets: 0, gainTotal: 6960, mensualites: null, partCreditLoyers: null },
  ...extra
})

describe('creditRentalLine', () => {
  it('crédit d\'un bien loué : valeurs sur la durée de la location, avec son début', () => {
    expect(lineText(credit())).toMatchObject({
      text: 'Loyers 650,00 €/mois · mensualités 830,00 €/mois · couverture 78 % · effort 180,00 €/mois',
      depuis: 'août 2021',
      prevu: false
    })
  })

  it('location pas encore commencée : valeurs attendues signalées comme prévues', () => {
    expect(lineText(credit({
      periode: { debut: null, mois: 0 }, loyers: 0, loyerMensuelMoyen: null, mensualiteMoyenne: null, cashFlowMensuel: null, tauxCouverture: null,
      cumul: { loyers: 0 }
    }))).toMatchObject({
      text: 'Loyers 650,00 €/mois · mensualités 830,00 €/mois · couverture 78 % · effort 180,00 €/mois',
      prevu: true,
      depuis: null
    })
  })

  it('cash-flow positif affiché comme un cash-flow, couverture nulle omise', () => {
    expect(lineText(credit({ mensualiteMoyenne: null, cashFlowMensuel: 120, tauxCouverture: null }))).toMatchObject({
      text: 'Loyers 650,00 €/mois · cash-flow 120,00 €/mois'
    })
  })

  it('aucune ligne sans bien lié, ni loyer perçu ou attendu', () => {
    expect(creditRentalLine(credit({ bien: null }))).toBeNull()
    expect(creditRentalLine(credit({ cumul: { loyers: 0 }, attendu: { loyerMensuel: null, mensualite: 830, cashFlowMensuel: null, tauxCouverture: null } }))).toBeNull()
    expect(creditRentalLine(undefined)).toBeNull()
  })

  it('aucune ligne sans mois complet ni loyer attendu', () => {
    const rentabilite = credit({ periode: { debut: null, mois: 0 }, attendu: { loyerMensuel: null, mensualite: 830, cashFlowMensuel: null, tauxCouverture: null } })
    expect(creditRentalLine(rentabilite)).toBeNull()
  })
})

describe('bienRentalBlock', () => {
  it('bien loué depuis plusieurs années : loyer moyen et début de la location', () => {
    const block = bienRentalBlock(bien())!
    expect(spaces(block.loyer)).toBe('650,00 €/mois')
    expect(block.prevu).toBe(false)
    expect(block.depuis).toBe('août 2021')
  })

  it('sans mois complet : loyer attendu, prévu', () => {
    const block = bienRentalBlock(bien({ periode: { debut: null, mois: 0 }, loyerMensuelMoyen: null }))!
    expect(spaces(block.loyer)).toBe('650,00 €/mois')
    expect(block).toMatchObject({ prevu: true, depuis: null })
  })

  it('bien locatif sans loyer : aucun bloc', () => {
    const rentabilite = bien({ periode: { debut: null, mois: 0 }, loyerMensuelMoyen: null, attendu: { loyerMensuel: null } })
    expect(bienRentalBlock(rentabilite)).toBeNull()
    expect(bienRentalBlock(undefined)).toBeNull()
  })
})

describe('bienBilanBlock', () => {
  const bilan = (extra: Partial<BienBilan> = {}): BienBilan => ({
    plusValue: 25000, loyersNets: 41800, interets: 18000, gainTotal: 48800, mensualites: 59760, partCreditLoyers: 78.31, ...extra
  })
  const texts = (block: ReturnType<typeof bienBilanBlock>) =>
    block && [...block.lignes, block.gainTotal].map(line => `${line.label} ${spaces(line.montant)}`)

  it('bien loué à crédit : montants signés, gain total et part du crédit payée par les loyers', () => {
    const block = bienBilanBlock(bilan(), true)!
    expect(texts(block)).toEqual([
      'Plus-value +25 000,00 €', 'Loyers et dépenses +41 800,00 €', 'Intérêts d\'emprunt -18 000,00 €', 'Gain total +48 800,00 €'
    ])
    expect(block.lignes.map(line => line.classe)).toEqual(['montant-positif', 'montant-positif', 'montant-negatif'])
    expect(spaces(block.partCreditLoyers!)).toBe('Crédit payé par les loyers : 78 %')
  })

  it('valeur actuelle non renseignée : la ligne plus-value l\'indique', () => {
    const block = bienBilanBlock(bilan({ plusValue: 0, gainTotal: 23800 }), false)!
    expect(texts(block)![0]).toBe('Plus-value (valeur non renseignée) 0,00 €')
    expect(block.lignes[0]!.classe).toBe('')
  })

  it('bien acheté comptant : ni ligne d\'intérêts ni part du crédit', () => {
    const block = bienBilanBlock(bilan({ interets: 0, mensualites: null, partCreditLoyers: null, gainTotal: 66800 }), true)!
    expect(block.lignes.map(line => line.label)).toEqual(['Plus-value', 'Loyers et dépenses'])
    expect(block.partCreditLoyers).toBeNull()
  })

  it('bien locatif sans historique ni valeur actuelle : aucun bloc', () => {
    const vide = bilan({ plusValue: 0, loyersNets: 0, interets: 0, gainTotal: 0, mensualites: null, partCreditLoyers: null })
    expect(bienBilanBlock(vide, false)).toBeNull()
    expect(bienBilanBlock(vide, true)).not.toBeNull()
    expect(bienBilanBlock(undefined, true)).toBeNull()
  })
})
