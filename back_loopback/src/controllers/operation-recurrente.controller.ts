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
import {authenticate} from '@loopback/authentication';

@authenticate('jwt')
export class OperationRecurrenteController {
  constructor(
    @repository(OperationRecurrenteRepository)
    public operationRecurrenteRepository: OperationRecurrenteRepository,
  ) {}

  @post('/operation-recurrentes', {
    responses: {
      '200': {
        description: 'OperationRecurrente model instance',
        content: {
          'application/json': {schema: getModelSchemaRef(OperationRecurrente)},
        },
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
              items: getModelSchemaRef(OperationRecurrente, {
                includeRelations: true,
              }),
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
    return this.operationRecurrenteRepository.updateAll(
      operationRecurrente,
      where,
    );
  }

  @get('/operation-recurrentes/{id}', {
    responses: {
      '200': {
        description: 'OperationRecurrente model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(OperationRecurrente, {
              includeRelations: true,
            }),
          },
        },
      },
    },
  })
  async findById(
    @param.path.number('id') id: number,
    @param.filter(OperationRecurrente, {exclude: 'where'})
    filter?: FilterExcludingWhere<OperationRecurrente>,
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
    await this.operationRecurrenteRepository.updateById(
      id,
      operationRecurrente,
    );
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
    await this.operationRecurrenteRepository.replaceById(
      id,
      operationRecurrente,
    );
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

  @post('/operation-recurrentes/auto-generation/{userID}', {
    responses: {
      '200': {
        description: 'Operation Recurrente auto generation POST success',
      },
    },
  })
  async autoGeneration(
    @param.path.number('userID') userID: number,
  ): Promise<Object> {
    const sqlGet =
      'SELECT * FROM OperationRecurrente NATURAL JOIN Compte WHERE IDuser = ' +
      userID;
    const sqlInsertNewOp =
      'INSERT INTO Operation (NomOp, MontantOp, DateOp, IDcompte, IDcat, CheckOp) VALUES ';
    const sqlUpdateOpRec =
      'UPDATE OperationRecurrente SET DernierDateOpRecu = "';
    const millisecondDay = 24 * 60 * 60 * 1000;

    const insertNewOpFromRec = async (
      opLastDate: any,
      opRec: any,
      list: any,
    ) => {
      await this.operationRecurrenteRepository.execute(
        sqlInsertNewOp +
          `("${opRec.NomOpRecu}", ${opRec.MontantOpRecu}, "${
            opLastDate.toISOString().split('T')[0]
          }", ${opRec.IDcompte}, ${opRec.IDcat}), 0`,
      );

      await this.operationRecurrenteRepository.execute(
        sqlUpdateOpRec +
          opLastDate.toISOString().split('T')[0] +
          `" WHERE IDopRecu = ${opRec.IDopRecu}`,
      );

      await goToNext(list);
    };

    const newOpFromRec = async (opRec: any, list: any) => {
      const currentDate: any = new Date();
      const opLastDate: any = new Date(opRec.DernierDateOpRecu);

      opLastDate.setHours(12);

      switch (opRec.Frequence) {
        case 3:
          if (currentDate - opLastDate > 15 * millisecondDay) {
            opLastDate.setMonth(opLastDate.getMonth() + 1);

            await insertNewOpFromRec(opLastDate, opRec, list);
          } else {
            await goToNext(list);
          }
          break;

        case 7:
          if (currentDate - opLastDate > 335 * millisecondDay) {
            opLastDate.setFullYear(opLastDate.getFullYear() + 1);

            await insertNewOpFromRec(opLastDate, opRec, list);
          } else {
            await goToNext(list);
          }
          break;
      }
    };

    const goToNext = async (list: any) => {
      if (list.length > 0) {
        await newOpFromRec(list.pop(), list);
      }
    };

    const data = await this.operationRecurrenteRepository.execute(sqlGet);

    await newOpFromRec(data.pop(), data);

    return {};
  }
}
