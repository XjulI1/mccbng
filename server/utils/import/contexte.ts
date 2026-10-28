import { rawQuery } from '../sql'
import type { CategorieContexte, Correspondance, LibelleUsuel } from './types'

const LIBELLES_USUELS = 150
const CORRESPONDANCES = 200
const HISTORIQUE_MOIS = 24

// Catégories lisibles par l'utilisateur : les siennes et les partagées (IDuser = 0, dont « Aucune »).
export const loadCategories = (userId: number) =>
  rawQuery<CategorieContexte>('SELECT IDcat, Nom, `Type` FROM Categorie WHERE IDuser IN (?, 0) ORDER BY IDcat', [userId])

// Libellés les plus saisis par l'utilisateur, tels quels : modèle de style et exemples de catégorie pour le LLM.
export const loadLibellesUsuels = async (userId: number): Promise<LibelleUsuel[]> => {
  const rows = await rawQuery<{ NomOp: string; IDcat: number | null; occurrences: number }>(
    'SELECT MIN(NomOp) AS NomOp, IDcat, COUNT(*) AS occurrences ' +
    'FROM Operation JOIN Compte USING (IDcompte) ' +
    'WHERE Compte.IDuser = ? AND DateOp >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? MONTH) ' +
    'GROUP BY NomOp, IDcat ORDER BY occurrences DESC, NomOp LIMIT ?',
    [userId, HISTORIQUE_MOIS, LIBELLES_USUELS]
  )
  return rows.map(r => ({ NomOp: r.NomOp, IDcat: r.IDcat ?? 0, occurrences: Number(r.occurrences) }))
}

// Correspondances apprises des imports validés : la plus récente par clé source (y compris quand l'utilisateur a gardé le libellé brut).
export const loadCorrespondances = async (userId: number): Promise<Correspondance[]> => {
  const rows = await rawQuery<Correspondance>(
    'SELECT l.CleSource, l.LibelleSource, l.NomOp, l.IDcat ' +
    'FROM ImportLigne l JOIN ImportLot i USING (IDimport) ' +
    "WHERE i.IDuser = ? AND i.Statut = 'valide' AND l.Selection = 1 AND l.CleSource <> '' " +
    'ORDER BY i.DateValidation DESC, l.IDligne DESC LIMIT ?',
    [userId, CORRESPONDANCES * 5]
  )
  const parCle = new Map<string, Correspondance>()
  for (const row of rows) if (!parCle.has(row.CleSource)) parCle.set(row.CleSource, row)
  return [...parCle.values()].slice(0, CORRESPONDANCES)
}
