// Insertion d'une paire débit / crédit sans transaction (Operation peut être en MyISAM) :
// si la seconde insertion échoue, la première est supprimée (compensation) avant de relancer l'erreur.
export const insertCompensatedPair = async <T>(
  insert: (values: T) => Promise<number>,
  remove: (id: number) => Promise<void>,
  first: T,
  second: T
): Promise<[number, number]> => {
  const firstId = await insert(first)
  try {
    return [firstId, await insert(second)]
  } catch (error) {
    await remove(firstId)
    throw error
  }
}
