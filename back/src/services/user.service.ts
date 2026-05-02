// Copyright IBM Corp. and LoopBack contributors 2020. All Rights Reserved.
// Node module: @loopback/authentication-jwt
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {securityId, UserProfile} from '@loopback/security';
import {compare} from 'bcryptjs';
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
    const hashToCheck = foundUser?.secret_key ?? dummyHash;

    const matched = await compare(credentials.code, hashToCheck);

    if (!foundUser || !matched) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
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
