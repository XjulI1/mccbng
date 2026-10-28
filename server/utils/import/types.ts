import { z } from 'zod'

// Sortie structurée demandée au LLM (une ligne par opération lue dans la source).
export const ExtractionSchema = z.object({
  lignes: z.array(z.object({
    // AAAA-MM-JJ
    date: z.string(),
    // Libellé tel que lu dans la source
    libelleSource: z.string(),
    // Libellé proposé, au style de l'utilisateur
    libelle: z.string(),
    // Négatif = sortie d'argent, positif = entrée
    montant: z.number(),
    idCategorie: z.number().int(),
    confiance: z.enum(['haute', 'moyenne', 'faible']),
    // Année, mois ou jour déduit ou illisible
    dateIncertaine: z.boolean()
  }))
})

export type LigneExtraite = z.infer<typeof ExtractionSchema>['lignes'][number]
export type Confiance = LigneExtraite['confiance']

export interface ImageSource { mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; data: string }
export interface CategorieContexte { IDcat: number; Nom: string; Type: string }
export interface LibelleUsuel { NomOp: string; IDcat: number; occurrences: number }
export interface Correspondance { CleSource: string; LibelleSource: string; NomOp: string; IDcat: number }

export interface ExtractionInput {
  texte?: string
  images: ImageSource[]
  categories: CategorieContexte[]
  libellesUsuels: LibelleUsuel[]
  correspondances: Correspondance[]
  // AAAA-MM-JJ
  dateReference: string
}

export interface ExtractionResult {
  lignes: LigneExtraite[]
  usage: { input: number; output: number }
  modele: string
}

// Port d'extraction : l'adaptateur Anthropic par défaut, remplaçable (tests, futur producteur MCP).
export interface OperationExtractor {
  extract(input: ExtractionInput): Promise<ExtractionResult>
}
