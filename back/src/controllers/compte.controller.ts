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
import {CompteRepository} from '../repositories';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {getCurrentUserId} from '../services/current-user';

@authenticate('jwt')
export class CompteController {
  constructor(
    @repository(CompteRepository)
    public compteRepository: CompteRepository,
  ) {}

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
    await this.compteRepository.deleteById(id);
  }
}
