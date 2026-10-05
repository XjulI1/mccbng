// Échappe un terme saisi pour un motif LIKE (caractère d'échappement `\`, déclaré par le serveur via ESCAPE) :
// `%` et `_` saisis sont cherchés littéralement. À appliquer avant d'ajouter ses propres jokers.
export const escapeLike = (term: string): string => term.replace(/[\\%_]/g, char => `\\${char}`)
