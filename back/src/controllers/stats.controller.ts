import {AnyObject, repository} from '@loopback/repository';

import {Stats} from '../models';
import {StatsRepository} from '../repositories';
import {get, getModelSchemaRef} from '@loopback/rest';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {getCurrentUserId} from '../services/current-user';

@authenticate('jwt')
export class StatsController {
  constructor(
    @repository(StatsRepository)
    public statsRepository: StatsRepository,
  ) {}

  @get('/stats/evolutionSolde', {
    responses: {
      '200': {
        description: 'Stats for a user',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              items: getModelSchemaRef(Stats, {includeRelations: true}),
            },
          },
        },
      },
    },
  })
  async evolutionSolde(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ): Promise<AnyObject> {
    return this.statsRepository.evolutionSolde(
      getCurrentUserId(currentUserProfile),
    );
  }
}
