import {BootMixin} from '@loopback/boot';
import {ApplicationConfig, generateUniqueId} from '@loopback/core';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {ServiceMixin} from '@loopback/service-proxy';
import path from 'path';
import {MySequence} from './sequence';
import {MyUserService} from './services/user.service';
import {JwtService} from './services/jwt.service';
import {jwtTtlSeconds} from './services/jwt-config';
import {loginRateLimiter} from './services/login-rate-limiter';
import {UserRepository, UserCredentialsRepository} from './repositories';

import {AuthenticationComponent} from '@loopback/authentication';
import {
  JWTAuthenticationComponent,
  TokenServiceBindings,
} from '@loopback/authentication-jwt';
import {UserServiceBindings} from './services/keys';

export {ApplicationConfig};

export class ApiLoopbackApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    // Set up the custom sequence
    this.sequence(MySequence);

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    // Mount authentication system
    this.component(AuthenticationComponent);
    // Mount jwt component
    this.component(JWTAuthenticationComponent);

    // Bind user service
    this.bind(UserServiceBindings.USER_SERVICE).toClass(MyUserService);
    // Bind user and credentials repository
    this.bind(UserServiceBindings.USER_REPOSITORY).toClass(UserRepository);
    this.bind(UserServiceBindings.USER_CREDENTIALS_REPOSITORY).toClass(
      UserCredentialsRepository,
    );
    // Use a persistent secret from JWT_SECRET when provided (so tokens survive
    // restarts); otherwise fall back to a fresh per-boot random value, which
    // intentionally invalidates all existing tokens on restart.
    this.bind(TokenServiceBindings.TOKEN_SECRET).to(
      process.env.JWT_SECRET ?? generateUniqueId(),
    );
    this.bind(TokenServiceBindings.TOKEN_EXPIRES_IN).to(
      String(jwtTtlSeconds()),
    );
    // Override the default JWT service so IDuser survives the token round-trip
    this.bind(TokenServiceBindings.TOKEN_SERVICE).toClass(JwtService);

    // Brute-force protection on the login endpoint.
    this.expressMiddleware('middleware.loginRateLimiter', loginRateLimiter);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
  }
}
