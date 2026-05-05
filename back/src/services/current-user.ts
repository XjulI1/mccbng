import {HttpErrors} from '@loopback/rest';
import {UserProfile} from '@loopback/security';
import {CompteRepository} from '../repositories';

export function getCurrentUserId(profile: UserProfile): number {
  const id = profile.IDuser;
  if (typeof id !== 'number') {
    throw new HttpErrors.Unauthorized('Missing user identifier in token');
  }
  return id;
}

export async function getUserCompteIds(
  compteRepository: CompteRepository,
  profile: UserProfile,
): Promise<number[]> {
  const IDuser = getCurrentUserId(profile);
  const comptes = await compteRepository.find({
    where: {IDuser},
    fields: {IDcompte: true},
  });
  return comptes
    .map(c => c.IDcompte)
    .filter((id): id is number => id !== undefined);
}
