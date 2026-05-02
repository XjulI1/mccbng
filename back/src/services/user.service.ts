// Copyright IBM Corp. and LoopBack contributors 2020. All Rights Reserved.
// Node module: @loopback/authentication-jwt
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {securityId, UserProfile} from '@loopback/security';
import {compare, hash} from 'bcryptjs';
import {User, UserWithRelations} from '../models';
import {UserRepository} from '../repositories';

export type Credentials = {
  email: string;
  code: string;
};

export class MyUserService {
  constructor(
    @repository(UserRepository) public userRepository: UserRepository,
  ) {}

  async verifyCredentials(credentials: Credentials): Promise<User> {
    const invalidCredentialsError = 'Invalid email or code.';

    if (!credentials.email || !credentials.code) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    const foundUser = await this.userRepository.findOne({
      where: {email: credentials.email},
    });

    // Always run a bcrypt compare even if the user is missing, to keep the
    // response time roughly constant and avoid leaking which emails exist.
    const dummyHash =
      '$2a$10$CwTycUXWue0Thq9StjUM0uJ8eVjvJ6gQzUk6lIjJ0nFv2YPm0jQOG';
    const stored = foundUser?.secret_key ?? dummyHash;
    const isBcrypt = stored.startsWith('$2');

    // Legacy users may still have a plaintext secret_key in the DB. We accept
    // a direct match on that path and rehash transparently below. Bcrypt
    // hashes always start with "$2", so a plaintext 6-digit code never
    // collides with this prefix.
    const matched = isBcrypt
      ? await compare(credentials.code, stored)
      : stored === credentials.code;

    if (!foundUser || !matched) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    // Lazy upgrade: rehash the secret_key on the first successful login of a
    // legacy user so that the plaintext value disappears from the DB without
    // any manual migration. Failures here are silently ignored — the next
    // login will retry.
    if (!isBcrypt) {
      try {
        const upgraded = await hash(credentials.code, 12);
        await this.userRepository.updateById(foundUser.id, {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          secret_key: upgraded,
        });
      } catch {
        // ignore — auth still succeeded, retry on next login
      }
    }

    return foundUser;
  }

  convertToUserProfile(user: User): UserProfile {
    return {
      [securityId]: user.id.toString(),
      name: user.username,
      id: user.id,
      email: user.email,
      IDuser: user.IDuser,
    };
  }

  async findUserById(id: string): Promise<User & UserWithRelations> {
    const userNotfound = 'invalid User';
    const foundUser = await this.userRepository.findOne({
      where: {id: id},
    });

    if (!foundUser) {
      throw new HttpErrors.Unauthorized(userNotfound);
    }
    return foundUser;
  }
}
