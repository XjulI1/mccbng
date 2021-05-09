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
import {OperationRecurrente} from '../models';
import {OperationRecurrenteRepository} from '../repositories';

export class OperationRecurrenteController {
  constructor(
    @repository(OperationRecurrenteRepository)
    public operationRecurrenteRepository : OperationRecurrenteRepository,
  ) {}

  @post('/operation-recurrentes', {
    responses: {
      '200': {
        description: 'OperationRecurrente model instance',
        content: {'application/json': {schema: getModelSchemaRef(OperationRecurrente)}},
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(OperationRecurrente, {
            title: 'NewOperationRecurrente',
            exclude: ['IDopRecu'],
          }),
        },
      },
    })
    operationRecurrente: Omit<OperationRecurrente, 'IDopRecu'>,
  ): Promise<OperationRecurrente> {
    return this.operationRecurrenteRepository.create(operationRecurrente);
  }

  @get('/operation-recurrentes/count', {
    responses: {
      '200': {
        description: 'OperationRecurrente model count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async count(
    @param.where(OperationRecurrente) where?: Where<OperationRecurrente>,
  ): Promise<Count> {
    return this.operationRecurrenteRepository.count(where);
  }

  @get('/operation-recurrentes', {
    responses: {
      '200': {
        description: 'Array of OperationRecurrente model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(OperationRecurrente, {includeRelations: true}),
            },
          },
        },
      },
    },
  })
  async find(
    @param.filter(OperationRecurrente) filter?: Filter<OperationRecurrente>,
  ): Promise<OperationRecurrente[]> {
    return this.operationRecurrenteRepository.find(filter);
  }

  @patch('/operation-recurrentes', {
    responses: {
      '200': {
        description: 'OperationRecurrente PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(OperationRecurrente, {partial: true}),
        },
      },
    })
    operationRecurrente: OperationRecurrente,
    @param.where(OperationRecurrente) where?: Where<OperationRecurrente>,
  ): Promise<Count> {
    return this.operationRecurrenteRepository.updateAll(operationRecurrente, where);
  }

  @get('/operation-recurrentes/{id}', {
    responses: {
      '200': {
        description: 'OperationRecurrente model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(OperationRecurrente, {includeRelations: true}),
          },
        },
      },
    },
  })
  async findById(
    @param.path.number('id') id: number,
    @param.filter(OperationRecurrente, {exclude: 'where'}) filter?: FilterExcludingWhere<OperationRecurrente>
  ): Promise<OperationRecurrente> {
    return this.operationRecurrenteRepository.findById(id, filter);
  }

  @patch('/operation-recurrentes/{id}', {
    responses: {
      '204': {
        description: 'OperationRecurrente PATCH success',
      },
    },
  })
  async updateById(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(OperationRecurrente, {partial: true}),
        },
      },
    })
    operationRecurrente: OperationRecurrente,
  ): Promise<void> {
    await this.operationRecurrenteRepository.updateById(id, operationRecurrente);
  }

  @put('/operation-recurrentes/{id}', {
    responses: {
      '204': {
        description: 'OperationRecurrente PUT success',
      },
    },
  })
  async replaceById(
    @param.path.number('id') id: number,
    @requestBody() operationRecurrente: OperationRecurrente,
  ): Promise<void> {
    await this.operationRecurrenteRepository.replaceById(id, operationRecurrente);
  }

  @del('/operation-recurrentes/{id}', {
    responses: {
      '204': {
        description: 'OperationRecurrente DELETE success',
      },
    },
  })
  async deleteById(@param.path.number('id') id: number): Promise<void> {
    await this.operationRecurrenteRepository.deleteById(id);
  }
}
