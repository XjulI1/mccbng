import { describe, expect, it } from 'vitest'
import {
  bienBilanBlock, bienRentalBlock, creditPartLoyers, creditRentalLine, type BienBilan, type BienRentabilite, type CreditRentabilite
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
  partCreditLoyers: 78.31,
  ...extra
})

const bien = (extra: Partial<BienRentabilite> = {}): BienRentabilite => ({
  periode: { debut: '2021-08', mois: 62 },
  loyerMensuelMoyen: 650,
  attendu: { loyerMensuel: 650 },
  bilan: { plusValue: 0, loyersNets: 6960, interets: 0, gainTotal: 6960, mensualites: null, partCreditLoyers: null },
  ...extra
})

describe('creditPartLoyers', () => {
  it('part des mensualités payée par les loyers, bornée à 100 %', () => {
    expect(creditPartLoyers(credit())).toBe(78.31)
    expect(creditPartLoyers(credit({ partCreditLoyers: 112.5 }))).toBe(100)
  })

  it('aucune part sans bien lié, sans loyer ou sans mensualité', () => {
    expect(creditPartLoyers(credit({ bien: null }))).toBeNull()
    expect(creditPartLoyers(credit({ partCreditLoyers: 0 }))).toBeNull()
    expect(creditPartLoyers(credit({ partCreditLoyers: null }))).toBeNull()
    expect(creditPartLoyers(undefined)).toBeNull()
  })
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

  it('bien non locatif : « Dépenses », total « Bilan » et pas de part du crédit payée par les loyers', () => {
    const block = bienBilanBlock(bilan({ loyersNets: -12000, gainTotal: -5000, partCreditLoyers: 0 }), true, false)!
    expect(texts(block)).toEqual([
      'Plus-value +25 000,00 €', 'Dépenses -12 000,00 €', 'Intérêts d\'emprunt -18 000,00 €', 'Bilan -5 000,00 €'
    ])
    expect(block.gainTotal.classe).toBe('montant-negatif')
    expect(block.partCreditLoyers).toBeNull()
  })

  it('bien non locatif comparé à la location : lignes du bilan puis loyers évités et rendement, total « Gain par rapport à la location »', () => {
    const comparaison = { mois: 63, loyerMensuel: 1350, tauxPlacement: 2.5, loyersEvites: 85050, coutOpportunite: 14736.67, gain: -13673.55 }
    const block = bienBilanBlock(
      bilan({ plusValue: -66644, loyersNets: 0, interets: 17342.88, gainTotal: -83986.88 }), true, false, comparaison
    )!
    expect([...block.lignes, block.gainTotal].map(line => spaces(`${line.label} ${line.montant}`))).toEqual([
      'Plus-value -66 644,00 €', 'Dépenses 0,00 €', 'Intérêts d\'emprunt -17 342,88 €',
      'Loyers évités (63 mois à 1 350,00 €) +85 050,00 €', 'Rendement si l\'argent avait été placé (2,5 %/an) -14 736,67 €',
      'Gain par rapport à la location -13 673,55 €'
    ])
    expect(block.gainTotal.classe).toBe('montant-negatif')
  })

  it('comparaison avec la location : bloc affiché même sans valeur actuelle ni opération', () => {
    const vide = bilan({ plusValue: 0, loyersNets: 0, interets: 0, gainTotal: 0, mensualites: null, partCreditLoyers: null })
    const comparaison = { mois: 12, loyerMensuel: 900, tauxPlacement: 3, loyersEvites: 10800, coutOpportunite: 4866.55, gain: 5933.45 }
    expect(spaces(bienBilanBlock(vide, false, false, comparaison)!.gainTotal.montant)).toBe('+5 933,45 €')
  })

  it('bien locatif occupé avant sa mise en location : ligne des loyers évités pendant l\'occupation avant le gain total', () => {
    const block = bienBilanBlock(bilan({ occupation: { mois: 79, loyerMensuel: 722.22, loyersEvites: 57055.38 }, gainTotal: 105855.38 }), true)!
    expect(texts(block)!.map(spaces)).toEqual([
      'Plus-value +25 000,00 €', 'Loyers et dépenses +41 800,00 €', 'Intérêts d\'emprunt -18 000,00 €',
      'Loyers évités pendant l\'occupation (79 mois à 722,22 €) +57 055,38 €', 'Gain total +105 855,38 €'
    ])
  })

  it('bien locatif : rendement non perçu après l\'occupation, en négatif', () => {
    const block = bienBilanBlock(bilan({
      occupation: { mois: 70, loyerMensuel: 888.89, loyersEvites: 62222.3 },
      rendementNonPercu: { tauxPlacement: 3, montant: 30000 }, gainTotal: 81022.3
    }), true)!
    expect(texts(block)!.map(spaces).slice(3)).toEqual([
      'Loyers évités pendant l\'occupation (70 mois à 888,89 €) +62 222,30 €',
      'Rendement si l\'argent avait été placé (3 %/an) -30 000,00 €',
      'Gain total +81 022,30 €'
    ])
  })

  it('bien locatif sans historique ni valeur actuelle : aucun bloc', () => {
    const vide = bilan({ plusValue: 0, loyersNets: 0, interets: 0, gainTotal: 0, mensualites: null, partCreditLoyers: null })
    expect(bienBilanBlock(vide, false)).toBeNull()
    expect(bienBilanBlock(vide, true)).not.toBeNull()
    expect(bienBilanBlock(undefined, true)).toBeNull()
  })
})

