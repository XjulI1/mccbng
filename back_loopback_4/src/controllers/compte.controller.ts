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
import {Compte} from '../models';
import {CompteRepository} from '../repositories';
import {authenticate} from '@loopback/authentication';

@authenticate('jwt')
export class CompteController {
  constructor(
    @repository(CompteRepository)
    public compteRepository : CompteRepository,
  ) {}

  @post('/comptes', {
    responses: {
      '200': {
        description: 'Compte model instance',
        content: {'application/json': {schema: getModelSchemaRef(Compte)}},
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Compte, {
            title: 'NewCompte',
            exclude: ['IDcompte'],
          }),
        },
      },
    })
    compte: Omit<Compte, 'IDcompte'>,
  ): Promise<Compte> {
    return this.compteRepository.create(compte);
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
    @param.where(Compte) where?: Where<Compte>,
  ): Promise<Count> {
    return this.compteRepository.count(where);
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
    @param.filter(Compte) filter?: Filter<Compte>,
  ): Promise<Compte[]> {
    return this.compteRepository.find(filter);
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
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Compte, {partial: true}),
        },
      },
    })
    compte: Compte,
    @param.where(Compte) where?: Where<Compte>,
  ): Promise<Count> {
    return this.compteRepository.updateAll(compte, where);
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
    @param.path.number('id') id: number,
    @param.filter(Compte, {exclude: 'where'}) filter?: FilterExcludingWhere<Compte>
  ): Promise<Compte> {
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
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Compte, {partial: true}),
        },
      },
    })
    compte: Compte,
  ): Promise<void> {
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
    @param.path.number('id') id: number,
    @requestBody() compte: Compte,
  ): Promise<void> {
    await this.compteRepository.replaceById(id, compte);
  }

  @del('/comptes/{id}', {
    responses: {
      '204': {
        description: 'Compte DELETE success',
      },
    },
  })
  async deleteById(@param.path.number('id') id: number): Promise<void> {
    await this.compteRepository.deleteById(id);
  }
}
