import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getModelSchemaRef,
  patch,
  put,
  del,
  requestBody,
  HttpErrors,
} from '@loopback/rest';
import {Compte} from '../models';
import {
  CompteRepository,
  CreditRepository,
  OperationRecurrenteRepository,
  OperationRepository,
} from '../repositories';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {getCurrentUserId} from '../services/current-user';

@authenticate('jwt')
export class CompteController {
  constructor(
    @repository(CompteRepository)
    public compteRepository: CompteRepository,
    @repository(OperationRepository)
    public operationRepository: OperationRepository,
    @repository(OperationRecurrenteRepository)
    public operationRecurrenteRepository: OperationRecurrenteRepository,
    @repository(CreditRepository)
    public creditRepository: CreditRepository,
  ) {}

  private async hasReferences(compteId: number): Promise<boolean> {
    const [opCount, recurCount, creditCount] = await Promise.all([
      this.operationRepository.count({IDcompte: compteId}),
      this.operationRecurrenteRepository.count({IDcompte: compteId}),
      this.creditRepository.count({IDcompte: compteId}),
    ]);
    return opCount.count + recurCount.count + creditCount.count > 0;
  }

  private scope(
    currentUserProfile: UserProfile,
    where?: Where<Compte>,
  ): Where<Compte> {
    const IDuser = getCurrentUserId(currentUserProfile);
    return where ? {and: [where, {IDuser}]} : {IDuser};
  }

  private async assertOwned(
    id: number,
    currentUserProfile: UserProfile,
  ): Promise<void> {
    const IDuser = getCurrentUserId(currentUserProfile);
    const compte = await this.compteRepository.findOne({
      where: {IDcompte: id, IDuser},
    });
    if (!compte) {
      throw new HttpErrors.NotFound(`Compte ${id} not found`);
    }
  }

  @post('/comptes', {
    responses: {
      '200': {
        description: 'Compte model instance',
        content: {'application/json': {schema: getModelSchemaRef(Compte)}},
      },
    },
  })
  async create(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Compte, {
            title: 'NewCompte',
            exclude: ['IDcompte', 'IDuser'],
          }),
        },
      },
    })
    compte: Omit<Compte, 'IDcompte' | 'IDuser'>,
  ): Promise<Compte> {
    return this.compteRepository.create({
      ...compte,
      IDuser: getCurrentUserId(currentUserProfile),
    });
  }

  @get('/comptes/management-info', {
    responses: {
      '200': {
        description:
          'Per-account management info: last operation date and whether the account is referenced by an Operation, OperationRecurrente or Credit (i.e. cannot be deleted).',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  IDcompte: {type: 'number'},
                  lastOpDate: {type: 'string', nullable: true},
                  hasReferences: {type: 'boolean'},
                },
              },
            },
          },
        },
      },
    },
  })
  async managementInfo(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ): Promise<
    Array<{IDcompte: number; lastOpDate: string | null; hasReferences: boolean}>
  > {
    const IDuser = getCurrentUserId(currentUserProfile);
    const comptes = await this.compteRepository.find({
      where: {IDuser},
      fields: {IDcompte: true},
    });
    const ids = comptes
      .map(c => c.IDcompte)
      .filter((id): id is number => id !== undefined);

    if (ids.length === 0) return [];

    const results = await Promise.all(
      ids.map(async compteId => {
        const [lastOp, recurCount, creditCount] = await Promise.all([
          this.operationRepository.findOne({
            where: {IDcompte: compteId},
            order: ['DateOp DESC'],
            fields: {DateOp: true},
          }),
          this.operationRecurrenteRepository.count({IDcompte: compteId}),
          this.creditRepository.count({IDcompte: compteId}),
        ]);
        const hasOperations = !!lastOp;
        return {
          IDcompte: compteId,
          lastOpDate: lastOp?.DateOp
            ? new Date(lastOp.DateOp).toISOString()
            : null,
          hasReferences:
            hasOperations || recurCount.count > 0 || creditCount.count > 0,
        };
      }),
    );
    return results;
  }

  @get('/comptes/count', {
    responses: {
      '200': {
        description: 'Compte model count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async count(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.where(Compte) where?: Where<Compte>,
  ): Promise<Count> {
    return this.compteRepository.count(this.scope(currentUserProfile, where));
  }

  @get('/comptes', {
    responses: {
      '200': {
        description: 'Array of Compte model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Compte, {includeRelations: true}),
            },
          },
        },
      },
    },
  })
  async find(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.filter(Compte) filter?: Filter<Compte>,
  ): Promise<Compte[]> {
    return this.compteRepository.find({
      ...filter,
      where: this.scope(currentUserProfile, filter?.where),
    });
  }

  @patch('/comptes', {
    responses: {
      '200': {
        description: 'Compte PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async updateAll(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Compte, {
            partial: true,
            exclude: ['IDuser'],
          }),
        },
      },
    })
    compte: Omit<Compte, 'IDuser'>,
    @param.where(Compte) where?: Where<Compte>,
  ): Promise<Count> {
    return this.compteRepository.updateAll(
      compte,
      this.scope(currentUserProfile, where),
    );
  }

  @get('/comptes/{id}', {
    responses: {
      '200': {
        description: 'Compte model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Compte, {includeRelations: true}),
          },
        },
      },
    },
  })
  async findById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
    @param.filter(Compte, {exclude: 'where'})
    filter?: FilterExcludingWhere<Compte>,
  ): Promise<Compte> {
    await this.assertOwned(id, currentUserProfile);
    return this.compteRepository.findById(id, filter);
  }

  @patch('/comptes/{id}', {
    responses: {
      '204': {
        description: 'Compte PATCH success',
      },
    },
  })
  async updateById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Compte, {
            partial: true,
            exclude: ['IDuser'],
          }),
        },
      },
    })
    compte: Omit<Compte, 'IDuser'>,
  ): Promise<void> {
    await this.assertOwned(id, currentUserProfile);
    await this.compteRepository.updateById(id, compte);
  }

  @put('/comptes/{id}', {
    responses: {
      '204': {
        description: 'Compte PUT success',
      },
    },
  })
  async replaceById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
    @requestBody() compte: Compte,
  ): Promise<void> {
    await this.assertOwned(id, currentUserProfile);
    compte.IDuser = getCurrentUserId(currentUserProfile);
    await this.compteRepository.replaceById(id, compte);
  }

  @del('/comptes/{id}', {
    responses: {
      '204': {
        description: 'Compte DELETE success',
      },
    },
  })
  async deleteById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
  ): Promise<void> {
    await this.assertOwned(id, currentUserProfile);
    if (await this.hasReferences(id)) {
      throw new HttpErrors.Conflict(
        `Compte ${id} cannot be deleted: it is referenced by at least one Operation, OperationRecurrente or Credit. Hide it instead by setting visible=false.`,
      );
    }
    await this.compteRepository.deleteById(id);
  }
}
