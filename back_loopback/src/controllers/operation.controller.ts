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
import {Operation} from '../models';
import {OperationRepository} from '../repositories';
import {authenticate} from '@loopback/authentication';

@authenticate('jwt')
export class OperationController {
  constructor(
    @repository(OperationRepository)
    public operationRepository: OperationRepository,
  ) {}

  @post('/operations', {
    responses: {
      '200': {
        description: 'Operation model instance',
        content: {'application/json': {schema: getModelSchemaRef(Operation)}},
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Operation, {
            title: 'NewOperation',
            exclude: ['IDop'],
          }),
        },
      },
    })
    operation: Omit<Operation, 'IDop'>,
  ): Promise<Operation> {
    return this.operationRepository.create(operation);
  }

  @get('/operations/count', {
    responses: {
      '200': {
        description: 'Operation model count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async count(
    @param.where(Operation) where?: Where<Operation>,
  ): Promise<Count> {
    return this.operationRepository.count(where);
  }

  @get('/operations', {
    responses: {
      '200': {
        description: 'Array of Operation model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Operation, {includeRelations: true}),
            },
          },
        },
      },
    },
  })
  async find(
    @param.filter(Operation) filter?: Filter<Operation>,
  ): Promise<Operation[]> {
    return this.operationRepository.find(filter);
  }

  @patch('/operations', {
    responses: {
      '200': {
        description: 'Operation PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Operation, {partial: true}),
        },
      },
    })
    operation: Operation,
    @param.where(Operation) where?: Where<Operation>,
  ): Promise<Count> {
    return this.operationRepository.updateAll(operation, where);
  }

  @get('/operations/{id}', {
    responses: {
      '200': {
        description: 'Operation model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Operation, {includeRelations: true}),
          },
        },
      },
    },
  })
  async findById(
    @param.path.number('id') id: number,
    @param.filter(Operation, {exclude: 'where'})
    filter?: FilterExcludingWhere<Operation>,
  ): Promise<Operation> {
    return this.operationRepository.findById(id, filter);
  }

  @patch('/operations/{id}', {
    responses: {
      '204': {
        description: 'Operation PATCH success',
      },
    },
  })
  async updateById(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Operation, {partial: true}),
        },
      },
    })
    operation: Operation,
  ): Promise<void> {
    await this.operationRepository.updateById(id, operation);
  }

  @put('/operations/{id}', {
    responses: {
      '204': {
        description: 'Operation PUT success',
      },
    },
  })
  async replaceById(
    @param.path.number('id') id: number,
    @requestBody() operation: Operation,
  ): Promise<void> {
    await this.operationRepository.replaceById(id, operation);
  }

  @del('/operations/{id}', {
    responses: {
      '204': {
        description: 'Operation DELETE success',
      },
    },
  })
  async deleteById(@param.path.number('id') id: number): Promise<void> {
    await this.operationRepository.deleteById(id);
  }

  @get('/operations/sumAllCompteForUser', {
    responses: {
      '200': {
        description: 'Operation sum for all user accounts',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Operation, {includeRelations: true}),
          },
        },
      },
    },
  })
  async sumAllCompteForUser(
    @param.query.number('userID') UserID: number,
    @param.filter(Operation) filter?: Filter<Operation>,
  ): Promise<any> {
    const sqlChecked =
      'SELECT IDCompte, SUM(MontantOp) as TotalChecked ' +
      'FROM Operation NATURAL JOIN Compte ' +
      'WHERE IDuser = ' +
      UserID +
      ' AND CheckOp = true AND Compte.visible = 1 ' +
      'GROUP BY IDCompte';

    const sqlNotChecked =
      'SELECT IDCompte, SUM(MontantOp) as TotalNotChecked ' +
      'FROM Operation NATURAL JOIN Compte  ' +
      'WHERE IDuser = ' +
      UserID +
      ' AND CheckOp = false AND Compte.visible = 1 ' +
      'GROUP BY IDCompte';

    let checkedTotal = await this.operationRepository.execute(sqlChecked);
    const notCheckedTotal = await this.operationRepository.execute(
      sqlNotChecked,
    );

    checkedTotal = checkedTotal.map((objectCheck: any) => {
      const filterCompte = notCheckedTotal.filter(
        (object: any) => object.IDCompte === objectCheck.IDCompte,
      );

      return Object.assign(objectCheck, {
        TotalNotChecked: (filterCompte[0] || 0)['TotalNotChecked'],
      });
    });

    return checkedTotal;
  }

  @get('/operations/sumForACompte', {
    responses: {
      '200': {
        description: 'Operation sum for all user accounts',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Operation, {includeRelations: true}),
          },
        },
      },
    },
  })
  async sumForACompte(
    @param.query.number('id') CompteID: number,
    @param.filter(Operation) filter?: Filter<Operation>,
  ): Promise<any> {
    const sqlChecked =
      'SELECT IDCompte, SUM(MontantOp) as TotalChecked ' +
      'FROM Operation ' +
      'WHERE IDcompte = ' +
      CompteID +
      ' AND CheckOp = true ' +
      'GROUP BY IDCompte';

    const sqlNotChecked =
      'SELECT IDCompte, SUM(MontantOp) as TotalNotChecked ' +
      'FROM Operation ' +
      'WHERE IDcompte = ' +
      CompteID +
      ' AND CheckOp = false ' +
      'GROUP BY IDCompte';

    const checkedTotal = await this.operationRepository.execute(sqlChecked);
    const notCheckedTotal = await this.operationRepository.execute(
      sqlNotChecked,
    );

    return Object.assign(checkedTotal[0] || {}, notCheckedTotal[0] || {});
  }

  @get('/operations/sumByUserByMonth', {
    responses: {
      '200': {
        description: 'Operation sum for all user accounts',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Operation, {includeRelations: true}),
          },
        },
      },
    },
  })
  async sumByUserByMonth(
    @param.query.number('userID') UserID: number,
    @param.query.number('monthNumber') MonthNumber: number,
    @param.query.number('yearNumber') YearNumber: number,
    @param.query.number('IDCompte') IDCompte: number,
    @param.filter(Operation) filter?: Filter<Operation>,
  ): Promise<any> {
    let SQLrequest =
      'SELECT ROUND(SUM(MontantOp), 2) as MonthNegative ' +
      'FROM Operation ' +
      'NATURAL JOIN Compte ' +
      'WHERE MONTH(DateOp) = ' +
      MonthNumber +
      ' ' +
      'AND YEAR(DateOp) = ' +
      YearNumber +
      ' ' +
      'AND Compte.IDuser = ' +
      UserID +
      ' ' +
      'AND IDcat IN ' +
      '(SELECT IDcat FROM Categorie WHERE Stats = 1 AND IDuser IN (0, ' +
      UserID +
      '))';

    if (IDCompte) {
      SQLrequest += 'AND IDCompte = ' + IDCompte;
    }

    return this.operationRepository.execute(SQLrequest);
  }

  @get('/operations/sumCategoriesByUserByMonth', {
    responses: {
      '200': {
        description: 'Operation sum for all user accounts',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Operation, {includeRelations: true}),
          },
        },
      },
    },
  })
  async sumCategoriesByUserByMonth(
    @param.query.number('userID') UserID: number,
    @param.query.number('monthNumber') MonthNumber: number,
    @param.query.number('yearNumber') YearNumber: number,
    @param.filter(Operation) filter?: Filter<Operation>,
  ): Promise<any> {
    const SQLrequest =
      'SELECT ROUND(SUM(MontantOp), 2) as TotalMonth, IDcat ' +
      'FROM Operation ' +
      'NATURAL JOIN Compte ' +
      'WHERE MONTH(DateOp) = ' +
      MonthNumber +
      ' ' +
      'AND YEAR(DateOp) = ' +
      YearNumber +
      ' ' +
      'AND Compte.IDuser = ' +
      UserID +
      ' ' +
      'AND IDcat IN ' +
      '(SELECT IDcat FROM Categorie WHERE Stats = 1 AND IDuser IN (0, ' +
      UserID +
      ')) ' +
      'GROUP BY IDcat';

    return this.operationRepository.execute(SQLrequest);
  }
}
