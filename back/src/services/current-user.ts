import {HttpErrors} from '@loopback/rest';
import {UserProfile} from '@loopback/security';

export function getCurrentUserId(profile: UserProfile): number {
  const id = profile.IDuser;
  if (typeof id !== 'number') {
    throw new HttpErrors.Unauthorized('Missing user identifier in token');
  }
  return id;
}
