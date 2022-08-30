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
} from '@loopback/rest';
import {Banque} from '../models';
import {BanqueRepository} from '../repositories';
import {authenticate} from '@loopback/authentication';

@authenticate('jwt')
export class BanqueController {
  constructor(
    @repository(BanqueRepository)
    public banqueRepository : BanqueRepository,
  ) {}

  @post('/banques', {
    responses: {
      '200': {
        description: 'Banque model instance',
        content: {'application/json': {schema: getModelSchemaRef(Banque)}},
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Banque, {
            title: 'NewBanque',
            exclude: ['IDbanque'],
          }),
        },
      },
    })
    banque: Omit<Banque, 'IDbanque'>,
  ): Promise<Banque> {
    return this.banqueRepository.create(banque);
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
    @param.where(Banque) where?: Where<Banque>,
  ): Promise<Count> {
    return this.banqueRepository.count(where);
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
    @param.filter(Banque) filter?: Filter<Banque>,
  ): Promise<Banque[]> {
    return this.banqueRepository.find(filter);
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
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Banque, {partial: true}),
        },
      },
    })
    banque: Banque,
    @param.where(Banque) where?: Where<Banque>,
  ): Promise<Count> {
    return this.banqueRepository.updateAll(banque, where);
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
    @param.path.number('id') id: number,
    @param.filter(Banque, {exclude: 'where'}) filter?: FilterExcludingWhere<Banque>
  ): Promise<Banque> {
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
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Banque, {partial: true}),
        },
      },
    })
    banque: Banque,
  ): Promise<void> {
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
    @param.path.number('id') id: number,
    @requestBody() banque: Banque,
  ): Promise<void> {
    await this.banqueRepository.replaceById(id, banque);
  }

  @del('/banques/{id}', {
    responses: {
      '204': {
        description: 'Banque DELETE success',
      },
    },
  })
  async deleteById(@param.path.number('id') id: number): Promise<void> {
    await this.banqueRepository.deleteById(id);
  }
}
