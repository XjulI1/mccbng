import { API_URL } from './config'
import { apiDelete, apiGet, apiPost } from './http'
import type { NormalizedImage } from '@/utils/imageNormalize'

export type Confiance = 'haute' | 'moyenne' | 'faible'
export type SourceImport = 'texte' | 'image' | 'video' | 'mixte'

export interface LigneImport {
  IDligne: number
  Ordre: number
  DateOp: string
  LibelleSource: string
  NomOp: string
  MontantOp: number
  IDcat: number
  Confiance: Confiance
  IDopDoublon: number | null
  DoublonLot: boolean
  Selection: boolean
  doublon: { IDop: number; NomOp: string; DateOp: string; MontantOp: number } | null
}

export interface LotImport {
  IDimport: number
  IDcompte: number
  Statut: 'brouillon' | 'valide' | 'abandonne'
  Source: string
  DateCreation: string
  lignes: LigneImport[]
}

export interface BrouillonImport {
  IDimport: number
  IDcompte: number
  NomCompte: string | null
  Source: string
  DateCreation: string
  nbLignes: number
}

export interface LigneValidee {
  IDligne?: number
  DateOp: string
  NomOp: string
  MontantOp: number
  IDcat: number
}

export const fetchImportDisponible = () =>
  apiGet<{ disponible: boolean }>(API_URL + '/api/imports/disponibilite').then(r => r.disponible)

export const fetchBrouillons = () => apiGet<BrouillonImport[]>(API_URL + '/api/imports')

export const fetchLot = (IDimport: number) => apiGet<LotImport>(API_URL + `/api/imports/${IDimport}`)

export const createLot = (body: { IDcompte: number; texte?: string; images: NormalizedImage[]; Source?: SourceImport }) =>
  apiPost<LotImport>(API_URL + '/api/imports', body)

export const validerLot = (IDimport: number, lignes: LigneValidee[]) =>
  apiPost<{ count: number; IDops: number[] }>(API_URL + `/api/imports/${IDimport}/valider`, { lignes })

export const abandonnerLot = (IDimport: number) => apiDelete(API_URL + `/api/imports/${IDimport}`)

// Message lisible pour une erreur d'import (statut renvoyé par l'API)
export const importErrorMessage = (error: unknown): string => {
  const status = (error as { status?: number })?.status
  const apiMessage = (error as { apiMessage?: string })?.apiMessage
  switch (status) {
  case 404: return 'Compte ou import introuvable.'
  case 409: return 'Cet import a déjà été validé.'
  case 413: return 'Envoi trop volumineux : retirez quelques images.'
  case 422: return apiMessage && !apiMessage.includes(':') ? apiMessage : 'Contenu refusé : vérifiez le texte et les images (20 images au plus).'
  case 429: return 'Trop d\'imports sur la dernière heure, réessayez plus tard.'
  case 502: return apiMessage ?? 'Le service d\'IA n\'a pas pu traiter la demande, réessayez.'
  case 503: return 'L\'import par IA n\'est pas activé sur ce serveur.'
  default: return 'Une erreur est survenue, réessayez.'
  }
}
