import {Entity, model, hasOne, property} from '@loopback/repository';
import {UserCredentials} from './user-credentials.model';
@model({
  settings: {
    strict: true,
    caseSensitiveEmail: true,
    hidden: ['verificationToken'],
    maxTTL: 31556926,
    ttl: 1209600,
  },
})
export class User extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: false,
    defaultFn: 'uuidv4',
  })
  id: string;

  @property({
    type: 'number',
  })
  IDuser: number;

  @property({
    type: 'string',
  })
  realm?: string;

  @property({
    type: 'string',
  })
  username?: string;

  @property({
    type: 'string',
    required: true,
    index: {
      unique: true,
    },
  })
  email: string;

  @property({
    type: 'number',
  })
  warningTotal?: number;

  @property({
    type: 'number',
  })
  warningCompte?: number;

  @property({
    type: 'number',
  })
  favoris?: number;

  @property({
    type: 'string',
  })
  secret_key: string;

  @property({
    type: 'boolean',
  })
  emailVerified?: boolean;

  @property({
    type: 'string',
  })
  verificationToken?: string;

  @hasOne(() => UserCredentials)
  userCredentials: UserCredentials;

  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<User>) {
    super(data);
  }
}

export interface UserRelations {
  // describe navigational properties here
}

export type UserWithRelations = User & UserRelations;
