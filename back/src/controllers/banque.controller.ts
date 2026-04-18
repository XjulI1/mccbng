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
import {Banque} from '../models';
import {BanqueRepository} from '../repositories';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {getCurrentUserId} from '../services/current-user';

@authenticate('jwt')
export class BanqueController {
  constructor(
    @repository(BanqueRepository)
    public banqueRepository: BanqueRepository,
  ) {}

  private scope(
    currentUserProfile: UserProfile,
    where?: Where<Banque>,
  ): Where<Banque> {
    const IDuser = getCurrentUserId(currentUserProfile);
    return where ? {and: [where, {IDuser}]} : {IDuser};
  }

  private async assertOwned(
    id: number,
    currentUserProfile: UserProfile,
  ): Promise<void> {
    const IDuser = getCurrentUserId(currentUserProfile);
    const banque = await this.banqueRepository.findOne({
      where: {IDbanque: id, IDuser},
    });
    if (!banque) {
      throw new HttpErrors.NotFound(`Banque ${id} not found`);
    }
  }

  @post('/banques', {
    responses: {
      '200': {
        description: 'Banque model instance',
        content: {'application/json': {schema: getModelSchemaRef(Banque)}},
      },
    },
  })
  async create(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Banque, {
            title: 'NewBanque',
            exclude: ['IDbanque', 'IDuser'],
          }),
        },
      },
    })
    banque: Omit<Banque, 'IDbanque' | 'IDuser'>,
  ): Promise<Banque> {
    return this.banqueRepository.create({
      ...banque,
      IDuser: getCurrentUserId(currentUserProfile),
    });
  }

  @get('/banques/count', {
    responses: {
      '200': {
        description: 'Banque model count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async count(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.where(Banque) where?: Where<Banque>,
  ): Promise<Count> {
    return this.banqueRepository.count(this.scope(currentUserProfile, where));
  }

  @get('/banques', {
    responses: {
      '200': {
        description: 'Array of Banque model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Banque, {includeRelations: true}),
            },
          },
        },
      },
    },
  })
  async find(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.filter(Banque) filter?: Filter<Banque>,
  ): Promise<Banque[]> {
    return this.banqueRepository.find({
      ...filter,
      where: this.scope(currentUserProfile, filter?.where),
    });
  }

  @patch('/banques', {
    responses: {
      '200': {
        description: 'Banque PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async updateAll(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Banque, {
            partial: true,
            exclude: ['IDuser'],
          }),
        },
      },
    })
    banque: Omit<Banque, 'IDuser'>,
    @param.where(Banque) where?: Where<Banque>,
  ): Promise<Count> {
    return this.banqueRepository.updateAll(
      banque,
      this.scope(currentUserProfile, where),
    );
  }

  @get('/banques/{id}', {
    responses: {
      '200': {
        description: 'Banque model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Banque, {includeRelations: true}),
          },
        },
      },
    },
  })
  async findById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
    @param.filter(Banque, {exclude: 'where'})
    filter?: FilterExcludingWhere<Banque>,
  ): Promise<Banque> {
    await this.assertOwned(id, currentUserProfile);
    return this.banqueRepository.findById(id, filter);
  }

  @patch('/banques/{id}', {
    responses: {
      '204': {
        description: 'Banque PATCH success',
      },
    },
  })
  async updateById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Banque, {
            partial: true,
            exclude: ['IDuser'],
          }),
        },
      },
    })
    banque: Omit<Banque, 'IDuser'>,
  ): Promise<void> {
    await this.assertOwned(id, currentUserProfile);
    await this.banqueRepository.updateById(id, banque);
  }

  @put('/banques/{id}', {
    responses: {
      '204': {
        description: 'Banque PUT success',
      },
    },
  })
  async replaceById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
    @requestBody() banque: Banque,
  ): Promise<void> {
    await this.assertOwned(id, currentUserProfile);
    banque.IDuser = getCurrentUserId(currentUserProfile);
    await this.banqueRepository.replaceById(id, banque);
  }

  @del('/banques/{id}', {
    responses: {
      '204': {
        description: 'Banque DELETE success',
      },
    },
  })
  async deleteById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
  ): Promise<void> {
    await this.assertOwned(id, currentUserProfile);
    await this.banqueRepository.deleteById(id);
  }
}
