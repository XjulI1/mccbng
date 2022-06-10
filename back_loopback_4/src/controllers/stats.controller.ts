import {
  AnyObject,
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';

import {Stats} from '../models';
import {StatsRepository} from '../repositories';
import {get, getModelSchemaRef, param} from "@loopback/rest";
import {authenticate} from '@loopback/authentication';

@authenticate('jwt')
export class StatsController {
  constructor(
    @repository(StatsRepository)
    public statsRepository : StatsRepository,
  ) {}

  @get('/stats/evolutionSolde/{userID}', {
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
    @param.path.string('userID') userID: number,
  ): Promise<AnyObject> {
    return this.statsRepository.evolutionSolde(userID);
  }
}
