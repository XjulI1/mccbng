import {AnyObject, repository} from '@loopback/repository';

import {Stats} from '../models';
import {CompteRepository, StatsRepository} from '../repositories';
import {get, getModelSchemaRef, HttpErrors, param} from '@loopback/rest';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {getCurrentUserId, getUserCompteIds} from '../services/current-user';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

function clampLimit(value?: number): number {
  if (!value || Number.isNaN(value)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.floor(value), 1), MAX_LIMIT);
}

function assertValidRange(from: string, to: string): void {
  if (!from || !to) {
    throw new HttpErrors.BadRequest('from and to are required');
  }
  if (Date.parse(from) > Date.parse(to)) {
    throw new HttpErrors.BadRequest('from must be earlier than to');
  }
}

@authenticate('jwt')
export class StatsController {
  constructor(
    @repository(StatsRepository)
    public statsRepository: StatsRepository,
    @repository(CompteRepository)
    public compteRepository: CompteRepository,
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

  @get('/stats/yearComparison', {
    responses: {
      '200': {
        description: 'Monthly totals for two years (yearA vs yearB)',
        content: {'application/json': {schema: {type: 'object'}}},
      },
    },
  })
  async yearComparison(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.query.number('yearA') yearA: number,
    @param.query.number('yearB') yearB: number,
  ): Promise<AnyObject> {
    if (!yearA || !yearB) {
      throw new HttpErrors.BadRequest('yearA and yearB are required');
    }
    const userID = getCurrentUserId(currentUserProfile);
    const ids = await getUserCompteIds(
      this.compteRepository,
      currentUserProfile,
    );
    return this.statsRepository.yearComparison(userID, ids, yearA, yearB);
  }

  @get('/stats/topCategories', {
    responses: {
      '200': {
        description: 'Top spending categories on a date range',
        content: {'application/json': {schema: {type: 'array'}}},
      },
    },
  })
  async topCategories(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.query.string('from') from: string,
    @param.query.string('to') to: string,
    @param.query.number('limit') limit?: number,
  ): Promise<AnyObject> {
    assertValidRange(from, to);
    const userID = getCurrentUserId(currentUserProfile);
    const ids = await getUserCompteIds(
      this.compteRepository,
      currentUserProfile,
    );
    return this.statsRepository.topCategories(
      userID,
      ids,
      from,
      to,
      clampLimit(limit),
    );
  }

  @get('/stats/incomeVsExpense', {
    responses: {
      '200': {
        description: 'Monthly income vs expense split for one year',
        content: {'application/json': {schema: {type: 'object'}}},
      },
    },
  })
  async incomeVsExpense(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.query.number('yearNumber') yearNumber: number,
  ): Promise<AnyObject> {
    if (!yearNumber) {
      throw new HttpErrors.BadRequest('yearNumber is required');
    }
    const userID = getCurrentUserId(currentUserProfile);
    const ids = await getUserCompteIds(
      this.compteRepository,
      currentUserProfile,
    );
    return this.statsRepository.incomeVsExpense(userID, ids, yearNumber);
  }

  @get('/stats/topOperations', {
    responses: {
      '200': {
        description: 'Largest operations of the period',
        content: {'application/json': {schema: {type: 'array'}}},
      },
    },
  })
  async topOperations(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.query.string('from') from: string,
    @param.query.string('to') to: string,
    @param.query.number('limit') limit?: number,
  ): Promise<AnyObject> {
    assertValidRange(from, to);
    const ids = await getUserCompteIds(
      this.compteRepository,
      currentUserProfile,
    );
    return this.statsRepository.topOperations(ids, from, to, clampLimit(limit));
  }

  @get('/stats/categoryHeatmap', {
    responses: {
      '200': {
        description: 'Month x category matrix of spending for a year',
        content: {'application/json': {schema: {type: 'object'}}},
      },
    },
  })
  async categoryHeatmap(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.query.number('yearNumber') yearNumber: number,
  ): Promise<AnyObject> {
    if (!yearNumber) {
      throw new HttpErrors.BadRequest('yearNumber is required');
    }
    const userID = getCurrentUserId(currentUserProfile);
    const ids = await getUserCompteIds(
      this.compteRepository,
      currentUserProfile,
    );
    return this.statsRepository.categoryHeatmap(userID, ids, yearNumber);
  }
}
