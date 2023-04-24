import {UserService} from './interfaces/user.service';
import {User} from '../models';
import {Credentials} from './user.service';
import {BindingKey} from '@loopback/core';

export namespace UserServiceBindings {
  export const USER_SERVICE = BindingKey.create<UserService<User, Credentials>>(
    'services.user.service',
  );
  export const USER_REPOSITORY = 'repositories.UserRepository';
  export const USER_CREDENTIALS_REPOSITORY =
    'repositories.UserCredentialsRepository';
}
