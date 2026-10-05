// Arrondi monétaire à 2 décimales ; Number.EPSILON corrige les demi-centimes mal représentés (1.005 → 1.01).
export const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100
