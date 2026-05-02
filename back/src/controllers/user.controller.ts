// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/example-todo-jwt
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {authenticate, TokenService} from '@loopback/authentication';
import {TokenServiceBindings} from '@loopback/authentication-jwt';
import {inject} from '@loopback/core';
import {model, property, repository} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  HttpErrors,
  patch,
  post,
  Response,
  RestBindings,
  requestBody,
  SchemaObject,
} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {genSalt, hash} from 'bcryptjs';
import _ from 'lodash';

import {User} from '../models';
import {MyUserService, Credentials} from '../services/user.service';
import {UserRepository} from '../repositories';
import {UserServiceBindings} from '../services/keys';
import {buildAuthCookie, clearAuthCookie} from '../services/auth-cookie';

@model()
export class NewUserRequest extends User {
  @property({
    type: 'string',
    required: true,
  })
  password: string;
}

const CredentialsSchema: SchemaObject = {
  type: 'object',
  required: ['email', 'code'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      maxLength: 254,
    },
    code: {
      type: 'string',
      maxLength: 6,
      minLength: 6,
    },
  },
};

export const CredentialsRequestBody = {
  description: 'The input of login function',
  required: true,
  content: {
    'application/json': {schema: CredentialsSchema},
  },
};

export class UserController {
  constructor(
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: MyUserService,
    @inject(SecurityBindings.USER, {optional: true})
    public user: UserProfile,
    @repository(UserRepository) protected userRepository: UserRepository,
    @inject(RestBindings.Http.RESPONSE) protected response: Response,
  ) {}

  @post('/users/login', {
    responses: {
      '200': {
        description: 'Token',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  })
  async login(
    @requestBody(CredentialsRequestBody) credentials: Credentials,
  ): Promise<{id: string; userId: number}> {
    const user = await this.userService.verifyCredentials(credentials);
    const userProfile = this.userService.convertToUserProfile(user);
    const token = await this.jwtService.generateToken(userProfile);

    this.response.setHeader('Set-Cookie', buildAuthCookie(token));

    return {id: token, userId: user.IDuser};
  }

  @authenticate('jwt')
  @post('/users/logout', {
    responses: {
      '204': {
        description: 'Logout',
      },
    },
  })
  async logout(): Promise<void> {
    this.response.setHeader('Set-Cookie', clearAuthCookie());
  }

  @authenticate('jwt')
  @get('/users/whoAmI', {
    responses: {
      '200': {
        description: 'Return current user',
        content: {
          'application/json': {
            schema: {
              type: 'string',
            },
          },
        },
      },
    },
  })
  async whoAmI(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<{
    favoris?: number;
    warningTotal?: number;
    warningCompte?: number;
    IDuser: number;
    email: string;
    username?: string;
  }> {
    const {favoris, warningTotal, warningCompte, IDuser, email, username} =
      await this.userService.findUserById(currentUserProfile[securityId]);
    return {
      favoris,
      warningTotal,
      warningCompte,
      IDuser,
      email,
      username,
    };
  }

  @authenticate('jwt')
  @patch('/users/me', {
    responses: {
      '204': {
        description: 'Update current user info',
      },
    },
  })
  async updateMe(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: {type: 'string'},
              username: {type: 'string'},
              warningTotal: {type: 'number'},
              warningCompte: {type: 'number'},
              favoris: {type: 'number'},
            },
            additionalProperties: false,
          },
        },
      },
    })
    updates: Partial<
      Pick<
        User,
        'email' | 'username' | 'warningTotal' | 'warningCompte' | 'favoris'
      >
    >,
  ): Promise<void> {
    const userId = currentUserProfile[securityId];
    const allowed = _.pick(updates, [
      'email',
      'username',
      'warningTotal',
      'warningCompte',
      'favoris',
    ]);

    if (allowed.email) {
      const existingByEmail = await this.userRepository.findOne({
        where: {email: allowed.email},
      });
      if (existingByEmail && existingByEmail.id !== userId) {
        throw new HttpErrors.Conflict('A user with this email already exists');
      }
    }

    await this.userRepository.updateById(userId, allowed);
  }

  @authenticate('jwt')
  @get('/users/exists', {
    responses: {
      '200': {
        description: 'Return if user token exist and is valid',
        content: {
          'application/json': {
            schema: {
              type: 'string',
            },
          },
        },
      },
    },
  })
  async exists(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<boolean> {
    try {
      return Boolean(currentUserProfile[securityId]);
    } catch (_err) {
      return false;
    }
  }

  @authenticate('jwt')
  @post('/signup', {
    responses: {
      '200': {
        description: 'User',
        content: {
          'application/json': {
            schema: {
              'x-ts-type': User,
            },
          },
        },
      },
    },
  })
  async signUp(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(NewUserRequest, {
            title: 'NewUser',
          }),
        },
      },
    })
    newUserRequest: NewUserRequest,
  ): Promise<User> {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const {secret_key, IDuser, email} = newUserRequest;

    if (email) {
      const existingByEmail = await this.userRepository.findOne({
        where: {email},
      });
      if (existingByEmail) {
        throw new HttpErrors.Conflict('A user with this email already exists');
      }
    }

    if (IDuser !== undefined && IDuser !== null) {
      const existingById = await this.userRepository.findOne({
        where: {IDuser},
      });
      if (existingById) {
        throw new HttpErrors.Conflict('IDuser is already in use');
      }
    }

    if (!secret_key || secret_key.length !== 6) {
      throw new HttpErrors.BadRequest(
        'secret_key must be exactly 6 characters',
      );
    }

    const hashedSecretKey = await hash(secret_key, 12);
    const password = await hash(newUserRequest.password, await genSalt());
    const savedUser = await this.userRepository.create({
      ..._.omit(newUserRequest, 'password', 'id', 'secret_key'),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      secret_key: hashedSecretKey,
    });

    await this.userRepository.userCredentials(savedUser.id).create({password});

    return savedUser;
  }
}
