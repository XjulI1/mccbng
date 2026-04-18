import {
  AnyObject,
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
import {Operation} from '../models';
import {CompteRepository, OperationRepository} from '../repositories';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {getCurrentUserId} from '../services/current-user';

@authenticate('jwt')
export class OperationController {
  constructor(
    @repository(OperationRepository)
    public operationRepository: OperationRepository,
    @repository(CompteRepository)
    public compteRepository: CompteRepository,
  ) {}

  private scope(
    currentUserProfile: UserProfile,
    where?: Where<Operation>,
  ): Where<Operation> {
    const IDuser = getCurrentUserId(currentUserProfile);
    return where ? {and: [where, {IDuser}]} : {IDuser};
  }

  private async assertOwned(
    id: number,
    currentUserProfile: UserProfile,
  ): Promise<void> {
    const IDuser = getCurrentUserId(currentUserProfile);
    const op = await this.operationRepository.findOne({
      where: {IDop: id, IDuser},
    });
    if (!op) {
      throw new HttpErrors.NotFound(`Operation ${id} not found`);
    }
  }

  private async assertCompteOwned(
    compteID: number,
    currentUserProfile: UserProfile,
  ): Promise<void> {
    const IDuser = getCurrentUserId(currentUserProfile);
    const compte = await this.compteRepository.findOne({
      where: {IDcompte: compteID, IDuser},
    });
    if (!compte) {
      throw new HttpErrors.NotFound(`Compte ${compteID} not found`);
    }
  }

  @post('/operations', {
    responses: {
      '200': {
        description: 'Operation model instance',
        content: {'application/json': {schema: getModelSchemaRef(Operation)}},
      },
    },
  })
  async create(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Operation, {
            title: 'NewOperation',
            exclude: ['IDop', 'IDuser'],
          }),
        },
      },
    })
    operation: Omit<Operation, 'IDop' | 'IDuser'>,
  ): Promise<Operation> {
    await this.assertCompteOwned(operation.IDcompte, currentUserProfile);
    return this.operationRepository.create({
      ...operation,
      IDuser: getCurrentUserId(currentUserProfile),
    });
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.where(Operation) where?: Where<Operation>,
  ): Promise<Count> {
    return this.operationRepository.count(
      this.scope(currentUserProfile, where),
    );
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.filter(Operation) filter?: Filter<Operation>,
  ): Promise<Operation[]> {
    return this.operationRepository.find({
      ...filter,
      where: this.scope(currentUserProfile, filter?.where),
    });
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Operation, {
            partial: true,
            exclude: ['IDuser'],
          }),
        },
      },
    })
    operation: Omit<Operation, 'IDuser'>,
    @param.where(Operation) where?: Where<Operation>,
  ): Promise<Count> {
    return this.operationRepository.updateAll(
      operation,
      this.scope(currentUserProfile, where),
    );
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
    @param.filter(Operation, {exclude: 'where'})
    filter?: FilterExcludingWhere<Operation>,
  ): Promise<Operation> {
    await this.assertOwned(id, currentUserProfile);
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Operation, {
            partial: true,
            exclude: ['IDuser'],
          }),
        },
      },
    })
    operation: Omit<Operation, 'IDuser'>,
  ): Promise<void> {
    await this.assertOwned(id, currentUserProfile);
    if (operation.IDcompte !== undefined) {
      await this.assertCompteOwned(operation.IDcompte, currentUserProfile);
    }
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
    @requestBody() operation: Operation,
  ): Promise<void> {
    await this.assertOwned(id, currentUserProfile);
    await this.assertCompteOwned(operation.IDcompte, currentUserProfile);
    operation.IDuser = getCurrentUserId(currentUserProfile);
    await this.operationRepository.replaceById(id, operation);
  }

  @del('/operations/{id}', {
    responses: {
      '204': {
        description: 'Operation DELETE success',
      },
    },
  })
  async deleteById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
  ): Promise<void> {
    await this.assertOwned(id, currentUserProfile);
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ): Promise<AnyObject> {
    const userID = getCurrentUserId(currentUserProfile);

    const sqlChecked =
      'SELECT IDCompte, SUM(MontantOp) as TotalChecked ' +
      'FROM Operation NATURAL JOIN Compte ' +
      'WHERE IDuser = ? AND CheckOp = true AND Compte.visible = 1 ' +
      'GROUP BY IDCompte';

    const sqlNotChecked =
      'SELECT IDCompte, SUM(MontantOp) as TotalNotChecked ' +
      'FROM Operation NATURAL JOIN Compte  ' +
      'WHERE IDuser = ? AND CheckOp = false AND Compte.visible = 1 ' +
      'GROUP BY IDCompte';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let checkedTotal: any = await this.operationRepository.execute(sqlChecked, [
      userID,
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notCheckedTotal: any = await this.operationRepository.execute(
      sqlNotChecked,
      [userID],
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    checkedTotal = checkedTotal.map((objectCheck: any) => {
      const filterCompte = notCheckedTotal.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.query.number('id') compteID: number,
  ): Promise<AnyObject> {
    await this.assertCompteOwned(compteID, currentUserProfile);

    const sqlChecked =
      'SELECT IDCompte, SUM(MontantOp) as TotalChecked ' +
      'FROM Operation ' +
      'WHERE IDcompte = ? AND CheckOp = true ' +
      'GROUP BY IDCompte';

    const sqlNotChecked =
      'SELECT IDCompte, SUM(MontantOp) as TotalNotChecked ' +
      'FROM Operation ' +
      'WHERE IDcompte = ? AND CheckOp = false ' +
      'GROUP BY IDCompte';

    const checkedTotal = await this.operationRepository.execute(sqlChecked, [
      compteID,
    ]);
    const notCheckedTotal = await this.operationRepository.execute(
      sqlNotChecked,
      [compteID],
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.query.number('monthNumber') monthNumber: number,
    @param.query.number('yearNumber') yearNumber: number,
    @param.query.number('IDCompte') idCompte?: number,
  ): Promise<AnyObject> {
    const userID = getCurrentUserId(currentUserProfile);

    const params: (number | string)[] = [
      monthNumber,
      yearNumber,
      userID,
      userID,
    ];

    let SQLrequest =
      'SELECT ROUND(SUM(MontantOp), 2) as MonthNegative ' +
      'FROM Operation ' +
      'NATURAL JOIN Compte ' +
      'WHERE MONTH(DateOp) = ? ' +
      'AND YEAR(DateOp) = ? ' +
      'AND Compte.IDuser = ? ' +
      'AND IDcat IN ' +
      '(SELECT IDcat FROM Categorie WHERE Stats = 1 AND IDuser IN (0, ?))';

    if (idCompte) {
      SQLrequest += ' AND IDCompte = ?';
      params.push(idCompte);
    }

    return this.operationRepository.execute(SQLrequest, params);
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.query.number('monthNumber') monthNumber: number,
    @param.query.number('yearNumber') yearNumber: number,
  ): Promise<AnyObject> {
    const userID = getCurrentUserId(currentUserProfile);

    const SQLrequest =
      'SELECT ROUND(SUM(MontantOp), 2) as TotalMonth, IDcat ' +
      'FROM Operation ' +
      'NATURAL JOIN Compte ' +
      'WHERE MONTH(DateOp) = ? ' +
      'AND YEAR(DateOp) = ? ' +
      'AND Compte.IDuser = ? ' +
      'AND IDcat IN ' +
      '(SELECT IDcat FROM Categorie WHERE Stats = 1 AND IDuser IN (0, ?)) ' +
      'GROUP BY IDcat';

    return this.operationRepository.execute(SQLrequest, [
      monthNumber,
      yearNumber,
      userID,
      userID,
    ]);
  }

  @get('/operations/suggestCategories', {
    responses: {
      '200': {
        description: 'Suggest categories based on operation name',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  IDcat: {type: 'number'},
                  weight: {type: 'number'},
                  count: {type: 'number'},
                },
              },
            },
          },
        },
      },
    },
  })
  async suggestCategories(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @param.query.string('operationName') operationName: string,
    @param.query.number('limit') limit?: number,
  ): Promise<AnyObject> {
    if (!operationName || operationName.trim().length < 2) {
      return [];
    }

    const userID = getCurrentUserId(currentUserProfile);
    const searchName = operationName.trim().toLowerCase();
    const limitValue = Math.min(Math.max(limit ?? 5, 1), 50);

    const SQLrequest =
      'SELECT IDcat, COUNT(*) as count ' +
      'FROM Operation ' +
      'NATURAL JOIN Compte ' +
      'WHERE Compte.IDuser = ? ' +
      'AND IDcat IS NOT NULL AND IDcat > 0 ' +
      'AND LOWER(NomOp) LIKE ? ' +
      'GROUP BY IDcat ' +
      'ORDER BY count DESC ' +
      'LIMIT ' +
      limitValue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any = await this.operationRepository.execute(SQLrequest, [
      userID,
      `%${searchName}%`,
    ]);

    const totalCount = results.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, item: any) => sum + item.count,
      0,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return results.map((item: any) => ({
      IDcat: item.IDcat,
      count: item.count,
      weight: totalCount > 0 ? (item.count / totalCount) * 100 : 0,
    }));
  }
}
