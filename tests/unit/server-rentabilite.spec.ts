import { describe, expect, it } from 'vitest'
import {
  bienRentabilite, creditRentabilite, flowKind, paidOnCredit, rentalPeriod, type Flow
} from '../../server/utils/rentabilite'

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const TODAY = d('2026-10-20')
const BIEN = 1
const CREDIT = 7

const lastMonths = (count: number, day = 5) =>
  Array.from({ length: count }, (_, i) => new Date(Date.UTC(2026, 9 - count + i, day)))

const loyer = (DateOp: Date, MontantOp = 650, IDbien = BIEN): Flow => ({ IDbien, IDcredit: null, MontantOp, DateOp })
const charge = (DateOp: Date, MontantOp: number, IDbien = BIEN): Flow => ({ IDbien, IDcredit: null, MontantOp, DateOp })
const mensualite = (DateOp: Date, MontantOp = -830, IDbien: number | null = null): Flow => ({ IDbien, IDcredit: CREDIT, MontantOp, DateOp })

const bien = (
  LoyerMensuel: number | null = null, ValeurActuelle: number | null = null, AbattementCharges: number | null = null,
  DateMiseEnLocation: Date | null = null
) => ({ PrixBienNu: 150000, FraisNotaire: 10000, FraisAgence: null, LoyerMensuel, ValeurActuelle, AbattementCharges, DateMiseEnLocation })
const credit = (extra: Partial<{ Statut: string | null; DateFin: Date; MontantMensuel: number }> = {}) => ({
  IDcredit: CREDIT, MontantMensuel: 830, Statut: 'actif', DateFin: d('2040-01-10'), ...extra
})

describe('flowKind', () => {
  it('loyer si positif, charge si négatif, ignoré si nul', () => {
    expect(flowKind(loyer(TODAY))).toBe('loyer')
    expect(flowKind(charge(TODAY, -840))).toBe('charge')
    expect(flowKind(loyer(TODAY, 0))).toBeNull()
  })

  it('IDcredit ou IDbien à 0 lus comme une absence de lien', () => {
    expect(flowKind({ ...loyer(TODAY), IDcredit: 0 })).toBe('loyer')
    expect(flowKind({ ...charge(TODAY, -840), IDcredit: 0 })).toBe('charge')
    expect(flowKind({ ...loyer(TODAY), IDbien: 0 })).toBeNull()
  })

  it('une opération liée à un crédit n\'est jamais un loyer ni une charge', () => {
    expect(flowKind(mensualite(TODAY, -830, BIEN))).toBeNull()
    expect(flowKind(mensualite(TODAY, -830, BIEN), CREDIT)).toBe('mensualite')
    expect(flowKind(mensualite(TODAY, 150000, BIEN), CREDIT)).toBeNull()
    expect(flowKind({ ...mensualite(TODAY, -830, BIEN), IDcredit: 99 }, CREDIT)).toBeNull()
  })
})

describe('rentalPeriod', () => {
  it('toute la durée depuis le début de la location, sans plafond, mois courant exclu', () => {
    expect(rentalPeriod(TODAY, d('2020-01-01')).periode).toEqual({ debut: '2020-01', fin: '2026-09', mois: 81 })
  })

  it('location récente', () => {
    expect(rentalPeriod(TODAY, d('2026-07-05')).periode).toEqual({ debut: '2026-07', fin: '2026-09', mois: 3 })
  })

  it('vide sans opération ou avec une seule opération du mois courant', () => {
    expect(rentalPeriod(TODAY, undefined).periode).toEqual({ debut: null, fin: null, mois: 0 })
    expect(rentalPeriod(TODAY, d('2026-10-05')).periode).toEqual({ debut: null, fin: null, mois: 0 })
  })

  it('janvier : la période s\'arrête en décembre', () => {
    expect(rentalPeriod(d('2027-01-03'), d('2026-01-15')).periode).toEqual({ debut: '2026-01', fin: '2026-12', mois: 12 })
  })

  it('location qui commence dans le futur : période vide', () => {
    expect(rentalPeriod(TODAY, d('2026-12-01')).periode).toEqual({ debut: null, fin: null, mois: 0 })
  })
})

describe('bienRentabilite', () => {
  it('bien loué toute l\'année : loyer moyen, cumul et bilan', () => {
    const flows = [...lastMonths(12).map(date => loyer(date)), charge(d('2026-09-15'), -840)]
    expect(bienRentabilite(bien(650), flows, TODAY)).toEqual({
      periode: { debut: '2025-10', fin: '2026-09', mois: 12 },
      loyers: 7800,
      charges: 840,
      loyerMensuelMoyen: 650,
      attendu: { loyerMensuel: 650 },
      cumul: { loyers: 7800, charges: 840 },
      bilan: { plusValue: 0, loyersNets: 6960, interets: 0, gainTotal: 6960, mensualites: null, partCreditLoyers: null }
    })
  })

  it('location de plus de 12 mois sans date déclarée : toute la durée, mois courant exclu', () => {
    const flows = [...lastMonths(22).map(date => loyer(date)), loyer(d('2026-10-05'))]
    const result = bienRentabilite(bien(), flows, TODAY)
    expect(result.periode).toEqual({ debut: '2024-12', fin: '2026-09', mois: 22 })
    expect(result.loyers).toBe(22 * 650)
    expect(result.loyerMensuelMoyen).toBe(650)
    expect(result.cumul.loyers).toBe(23 * 650)
  })

  it('ancien logement principal mis en location : période depuis la date déclarée, occupation dans le cumul seulement', () => {
    const flows = [
      loyer(d('2016-12-27'), 400), charge(d('2018-02-22'), -500),
      ...Array.from({ length: 63 }, (_, i) => loyer(new Date(Date.UTC(2021, 7 + i, 20))))
    ]
    const result = bienRentabilite(bien(null, null, null, d('2021-08-01')), flows, TODAY)
    expect(result.periode).toEqual({ debut: '2021-08', fin: '2026-09', mois: 62 })
    expect(result).toMatchObject({ loyers: 62 * 650, charges: 0, loyerMensuelMoyen: 650 })
    expect(result.cumul).toEqual({ loyers: 63 * 650 + 400, charges: 500 })
  })

  it('loyer moyen hors charges, loyers et charges sur l\'argent encaissé', () => {
    const flows = [...lastMonths(12).map(date => loyer(date, 750)), charge(d('2026-09-15'), -840)]
    expect(bienRentabilite(bien(null, null, 10), flows, TODAY)).toMatchObject({
      loyers: 9000, charges: 840, loyerMensuelMoyen: 675
    })
  })

  it('location récente : moyenne sur les seuls mois écoulés', () => {
    const flows = [d('2026-07-05'), d('2026-08-05'), d('2026-09-05'), d('2026-10-05')].map(date => loyer(date))
    const result = bienRentabilite(bien(), flows, TODAY)
    expect(result.periode).toEqual({ debut: '2026-07', fin: '2026-09', mois: 3 })
    expect(result.loyerMensuelMoyen).toBe(650)
  })

  it('bien sans opération : valeurs attendues seules', () => {
    expect(bienRentabilite(bien(650), [], TODAY)).toMatchObject({
      periode: { debut: null, fin: null, mois: 0 },
      loyerMensuelMoyen: null,
      attendu: { loyerMensuel: 650 }
    })
    expect(bienRentabilite(bien(), [], TODAY).attendu).toEqual({ loyerMensuel: null })
  })

  it('mensualité et déblocage liés au bien ignorés, échéance anticipée ignorée', () => {
    const flows = [loyer(d('2026-09-05')), mensualite(d('2026-09-10'), -830, BIEN), mensualite(d('2026-01-10'), 150000, BIEN), loyer(d('2026-10-25'))]
    const result = bienRentabilite(bien(), flows, TODAY)
    expect(result).toMatchObject({ loyers: 650, charges: 0, cumul: { loyers: 650, charges: 0 } })
  })
})

describe('creditRentabilite', () => {
  it('investissement locatif : effort et couverture du crédit, sans les charges du bien', () => {
    const flows = [
      ...lastMonths(12).map(date => loyer(date)),
      ...lastMonths(12, 10).map(date => mensualite(date)),
      charge(d('2026-09-15'), -840)
    ]
    expect(creditRentabilite(credit(), { IDbien: BIEN, LoyerMensuel: 650, AbattementCharges: null, DateMiseEnLocation: null }, flows, TODAY)).toEqual({
      bien: BIEN,
      periode: { debut: '2025-10', fin: '2026-09', mois: 12 },
      loyers: 7800,
      mensualites: 9960,
      loyerMensuelMoyen: 650,
      mensualiteMoyenne: 830,
      cashFlowMensuel: -180,
      tauxCouverture: 78.31,
      attendu: { loyerMensuel: 650, mensualite: 830, cashFlowMensuel: -180, tauxCouverture: 78.31 },
      cumul: { loyers: 7800, mensualites: 9960 }
    })
  })

  it('location récente sur un crédit ancien : période bornée au premier loyer, pas à la première mensualité', () => {
    const flows = [
      ...lastMonths(24, 10).map(date => mensualite(date)),
      ...[d('2026-07-05'), d('2026-08-05'), d('2026-09-05')].map(date => loyer(date))
    ]
    expect(creditRentabilite(credit(), { IDbien: BIEN, LoyerMensuel: 650, AbattementCharges: null, DateMiseEnLocation: null }, flows, TODAY)).toMatchObject({
      periode: { debut: '2026-07', fin: '2026-09', mois: 3 },
      loyers: 1950,
      mensualites: 2490,
      cashFlowMensuel: -180,
      tauxCouverture: 78.31,
      cumul: { loyers: 1950, mensualites: 24 * 830 }
    })
  })

  it('date de mise en location du bien : période du crédit depuis cette date, occupation et mensualités antérieures exclues', () => {
    const flows = [
      charge(d('2019-03-10'), -2000),
      ...Array.from({ length: 81 }, (_, i) => mensualite(new Date(Date.UTC(2020, i, 10)))),
      ...Array.from({ length: 62 }, (_, i) => loyer(new Date(Date.UTC(2021, 7 + i, 20))))
    ]
    const lien = { IDbien: BIEN, LoyerMensuel: 650, AbattementCharges: null, DateMiseEnLocation: d('2021-08-01') }
    const result = creditRentabilite(credit(), lien, flows, TODAY)
    expect(result.periode).toEqual({ debut: '2021-08', fin: '2026-09', mois: 62 })
    expect(result).toMatchObject({ loyers: 62 * 650, mensualites: 62 * 830, mensualiteMoyenne: 830, cashFlowMensuel: -180, tauxCouverture: 78.31 })
    expect(result.cumul).toEqual({ loyers: 62 * 650, mensualites: 81 * 830 })
    expect(result).not.toHaveProperty('charges')
  })

  it('déblocage lié au crédit et au bien ignoré', () => {
    const result = creditRentabilite(credit(), { IDbien: BIEN, LoyerMensuel: null, AbattementCharges: null, DateMiseEnLocation: null }, [mensualite(d('2026-01-10'), 150000, BIEN)], TODAY)
    expect(result).toMatchObject({ loyers: 0, mensualites: 0, cumul: { loyers: 0, mensualites: 0 } })
  })

  it('crédit sans bien : loyers nuls, pas de loyer attendu', () => {
    const result = creditRentabilite(credit(), null, lastMonths(12, 10).map(date => mensualite(date)), TODAY)
    expect(result).toMatchObject({ bien: null, periode: { mois: 0 }, loyers: 0, mensualites: 0, tauxCouverture: null, cumul: { mensualites: 9960 } })
    expect(result.attendu).toEqual({ loyerMensuel: null, mensualite: 830, cashFlowMensuel: null, tauxCouverture: null })
  })

  it('mensualité enregistrée en négatif par le formulaire de crédit : prise en valeur absolue', () => {
    const result = creditRentabilite(credit({ MontantMensuel: -830 }), { IDbien: BIEN, LoyerMensuel: 650, AbattementCharges: null, DateMiseEnLocation: null }, [], TODAY)
    expect(result.attendu).toEqual({ loyerMensuel: 650, mensualite: 830, cashFlowMensuel: -180, tauxCouverture: 78.31 })
  })

  it('crédit terminé ou échu : aucune mensualité attendue', () => {
    const lien = { IDbien: BIEN, LoyerMensuel: 650, AbattementCharges: null, DateMiseEnLocation: null }
    const termine = creditRentabilite(credit({ Statut: 'termine' }), lien, [], TODAY)
    expect(termine.attendu).toEqual({ loyerMensuel: 650, mensualite: 0, cashFlowMensuel: 650, tauxCouverture: null })
    expect(creditRentabilite(credit({ DateFin: d('2026-10-19') }), lien, [], TODAY).attendu.mensualite).toBe(0)
    expect(creditRentabilite(credit({ Statut: null }), lien, [], TODAY).attendu.mensualite).toBe(830)
  })

  it('sans mois complet : ratios réels nuls', () => {
    const result = creditRentabilite(credit(), { IDbien: BIEN, LoyerMensuel: 650, AbattementCharges: null, DateMiseEnLocation: null }, [loyer(d('2026-10-05'))], TODAY)
    expect(result).toMatchObject({ periode: { mois: 0 }, cashFlowMensuel: null, tauxCouverture: null, cumul: { loyers: 650 } })
  })
})

const sixYears = (count: number, day: number) =>
  Array.from({ length: count }, (_, i) => new Date(Date.UTC(2020, 9 + i, day)))

describe('bilan depuis l\'achat', () => {
  it('bien loué à crédit : plus-value + loyers nets − intérêts, part du crédit payée par les loyers', () => {
    const flows = [...sixYears(72, 5).map(date => loyer(date)), charge(d('2025-09-15'), -5000)]
    const share = { interets: 18000, mensualites: 59760 }
    expect(bienRentabilite(bien(650, 185000), flows, TODAY, share).bilan).toEqual({
      plusValue: 25000, loyersNets: 41800, interets: 18000, gainTotal: 48800, mensualites: 59760, partCreditLoyers: 78.31
    })
  })

  it('bien acheté comptant sans valeur estimée : plus-value nulle, ni intérêts ni part du crédit', () => {
    const flows = [...lastMonths(12).map(date => loyer(date)), charge(d('2026-09-15'), -840)]
    expect(bienRentabilite(bien(), flows, TODAY).bilan).toEqual({
      plusValue: 0, loyersNets: 6960, interets: 0, gainTotal: 6960, mensualites: null, partCreditLoyers: null
    })
  })

  it('valeur actuelle à 0 traitée comme non renseignée : plus-value nulle', () => {
    const flows = [...lastMonths(12).map(date => loyer(date)), charge(d('2026-09-15'), -840)]
    expect(bienRentabilite(bien(null, 0), flows, TODAY).bilan).toMatchObject({ plusValue: 0, gainTotal: 6960 })
  })

  it('crédit sans mensualité payée : part du crédit payée par les loyers nulle', () => {
    const share = { interets: 0, mensualites: 0 }
    expect(bienRentabilite(bien(), [loyer(d('2026-09-05'))], TODAY, share).bilan).toMatchObject({ mensualites: 0, partCreditLoyers: null })
  })

})

describe('abattement pour charges', () => {
  it('couverture et effort du crédit calculés sur les loyers après abattement', () => {
    const flows = [...lastMonths(12).map(date => loyer(date, 750)), ...lastMonths(12, 10).map(date => mensualite(date))]
    const result = creditRentabilite(credit(), { IDbien: BIEN, LoyerMensuel: 650, AbattementCharges: 10, DateMiseEnLocation: null }, flows, TODAY)
    expect(result).toMatchObject({
      loyers: 9000,
      mensualites: 9960,
      loyerMensuelMoyen: 675,
      tauxCouverture: 81.33,
      cashFlowMensuel: -155,
      cumul: { loyers: 9000, mensualites: 9960 },
      attendu: { tauxCouverture: 78.31 }
    })
  })

  it('bilan : part du crédit payée par les loyers après abattement, loyers nets et gain inchangés', () => {
    const flows = [...sixYears(72, 5).map(date => loyer(date)), charge(d('2025-09-15'), -5000)]
    const share = { interets: 18000, mensualites: 59760 }
    expect(bienRentabilite(bien(650, 185000, 10), flows, TODAY, share).bilan).toEqual({
      plusValue: 25000, loyersNets: 41800, interets: 18000, gainTotal: 48800, mensualites: 59760, partCreditLoyers: 70.48
    })
  })
})

describe('début de la location commun au bien et au crédit', () => {
  const travaux = charge(d('2026-04-10'), -2000)
  const loyers = [d('2026-07-05'), d('2026-08-05'), d('2026-09-05')].map(date => loyer(date))
  const mensualites = [4, 5, 6, 7, 8, 9].map(month => mensualite(new Date(Date.UTC(2026, month - 1, 10))))
  const lien = { IDbien: BIEN, LoyerMensuel: 650, AbattementCharges: null, DateMiseEnLocation: null }

  it('des travaux avant le premier loyer ne déplacent pas le début : même période et même loyer moyen des deux côtés', () => {
    const duBien = bienRentabilite(bien(650), [travaux, ...loyers], TODAY)
    const duCredit = creditRentabilite(credit(), lien, [travaux, ...loyers, ...mensualites], TODAY)
    expect(duBien.periode).toEqual({ debut: '2026-07', fin: '2026-09', mois: 3 })
    expect(duCredit.periode).toEqual(duBien.periode)
    expect(duBien).toMatchObject({ loyerMensuelMoyen: 650, charges: 0, cumul: { charges: 2000 } })
    expect(duCredit.loyerMensuelMoyen).toBe(650)
  })

  it('bien qui n\'a encore que des charges : location pas commencée, valeurs attendues', () => {
    const result = bienRentabilite(bien(650), [travaux], TODAY)
    expect(result).toMatchObject({ periode: { mois: 0 }, loyerMensuelMoyen: null, attendu: { loyerMensuel: 650 } })
  })

  it('crédit dont le bien n\'est pas encore loué : les mensualités ne démarrent pas la location', () => {
    const result = creditRentabilite(credit(), lien, [travaux, ...mensualites], TODAY)
    expect(result).toMatchObject({
      periode: { debut: null, fin: null, mois: 0 }, loyerMensuelMoyen: null, cashFlowMensuel: null, tauxCouverture: null,
      attendu: { loyerMensuel: 650, mensualite: 830 }
    })
  })

  it('date de mise en location renseignée : elle prime sur le premier loyer', () => {
    const declared = bienRentabilite(bien(650, null, null, d('2026-06-01')), [travaux, ...loyers], TODAY)
    expect(declared.periode).toEqual({ debut: '2026-06', fin: '2026-09', mois: 4 })
  })
})

describe('paidOnCredit', () => {
  it('intérêts calculés comme le restant dû, mensualités payées additionnées', () => {
    const payments = [{ MontantOp: -1100, DateOp: d('2026-01-10') }, { MontantOp: -1100, DateOp: d('2026-02-10') }]
    const paid = paidOnCredit({ MontantInitial: 100000, TauxInteret: 12 }, payments)
    expect(paid.mensualites).toBe(2200)
    expect(paid.interets).toBeCloseTo(1000 + 999, 6)
  })
})
