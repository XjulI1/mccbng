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
import {OperationRecurrente} from '../models';
import {CompteRepository, OperationRecurrenteRepository} from '../repositories';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {getCurrentUserId} from '../services/current-user';

// OperationRecurrente has no IDuser column; ownership is derived from the
// parent Compte. Endpoints must resolve the user's accounts first and then
// restrict queries to those IDcompte values.
@authenticate('jwt')
export class OperationRecurrenteController {
  constructor(
    @repository(OperationRecurrenteRepository)
    public operationRecurrenteRepository: OperationRecurrenteRepository,
    @repository(CompteRepository)
    public compteRepository: CompteRepository,
  ) {}

  private async userCompteIds(
    currentUserProfile: UserProfile,
  ): Promise<number[]> {
    const IDuser = getCurrentUserId(currentUserProfile);
    const comptes = await this.compteRepository.find({
      where: {IDuser},
      fields: {IDcompte: true},
    });
    return comptes
      .map(c => c.IDcompte)
      .filter((id): id is number => id !== undefined);
  }

  private async scope(
    currentUserProfile: UserProfile,
    where?: Where<OperationRecurrente>,
  ): Promise<Where<OperationRecurrente>> {
    const ids = await this.userCompteIds(currentUserProfile);
    const userScope: Where<OperationRecurrente> = {IDcompte: {inq: ids}};
    return where ? {and: [where, userScope]} : userScope;
  }

  private async assertOwned(
    id: number,
    currentUserProfile: UserProfile,
  ): Promise<void> {
    const op = await this.operationRecurrenteRepository.findOne({
      where: {IDopRecu: id},
    });
    if (!op) {
      throw new HttpErrors.NotFound(`OperationRecurrente ${id} not found`);
    }
    await this.assertCompteOwned(op.IDcompte, currentUserProfile);
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
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
    await this.assertCompteOwned(
      operationRecurrente.IDcompte,
      currentUserProfile,
    );
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.where(OperationRecurrente) where?: Where<OperationRecurrente>,
  ): Promise<Count> {
    return this.operationRecurrenteRepository.count(
      await this.scope(currentUserProfile, where),
    );
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.filter(OperationRecurrente) filter?: Filter<OperationRecurrente>,
  ): Promise<OperationRecurrente[]> {
    return this.operationRecurrenteRepository.find({
      ...filter,
      where: await this.scope(currentUserProfile, filter?.where),
    });
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
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
    if (operationRecurrente.IDcompte !== undefined) {
      await this.assertCompteOwned(
        operationRecurrente.IDcompte,
        currentUserProfile,
      );
    }
    return this.operationRecurrenteRepository.updateAll(
      operationRecurrente,
      await this.scope(currentUserProfile, where),
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
    @param.filter(OperationRecurrente, {exclude: 'where'})
    filter?: FilterExcludingWhere<OperationRecurrente>,
  ): Promise<OperationRecurrente> {
    await this.assertOwned(id, currentUserProfile);
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
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
    await this.assertOwned(id, currentUserProfile);
    if (operationRecurrente.IDcompte !== undefined) {
      await this.assertCompteOwned(
        operationRecurrente.IDcompte,
        currentUserProfile,
      );
    }
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
    @requestBody() operationRecurrente: OperationRecurrente,
  ): Promise<void> {
    await this.assertOwned(id, currentUserProfile);
    await this.assertCompteOwned(
      operationRecurrente.IDcompte,
      currentUserProfile,
    );
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
  async deleteById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
  ): Promise<void> {
    await this.assertOwned(id, currentUserProfile);
    await this.operationRecurrenteRepository.deleteById(id);
  }

  @post('/operation-recurrentes/auto-generation', {
    responses: {
      '200': {
        description: 'Operation Recurrente auto generation POST success',
      },
    },
  })
  async autoGeneration(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
  ): Promise<Object> {
    const userID = getCurrentUserId(currentUserProfile);

    const sqlGet =
      'SELECT * FROM OperationRecurrente NATURAL JOIN Compte WHERE IDuser = ?';
    const sqlInsertNewOp =
      'INSERT INTO Operation (NomOp, MontantOp, DateOp, IDcompte, IDcat, CheckOp, IDcredit) VALUES (?, ?, ?, ?, ?, 0, ?)';
    const sqlUpdateOpRec =
      'UPDATE OperationRecurrente SET DernierDateOpRecu = ? WHERE IDopRecu = ?';
    const millisecondDay = 24 * 60 * 60 * 1000;

    const insertNewOpFromRec = async (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      opLastDate: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      opRec: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      list: any,
    ) => {
      const day = opLastDate.toISOString().split('T')[0];
      await this.operationRecurrenteRepository.execute(sqlInsertNewOp, [
        opRec.NomOpRecu,
        opRec.MontantOpRecu,
        day,
        opRec.IDcompte,
        opRec.IDcat,
        opRec.IDcredit ?? null,
      ]);

      await this.operationRecurrenteRepository.execute(sqlUpdateOpRec, [
        day,
        opRec.IDopRecu,
      ]);

      await goToNext(list);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newOpFromRec = async (opRec: any, list: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentDate: any = new Date();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const goToNext = async (list: any) => {
      if (list.length > 0) {
        await newOpFromRec(list.pop(), list);
      }
    };

    const data = await this.operationRecurrenteRepository.execute(sqlGet, [
      userID,
    ]);

    if (data.length === 0) {
      return {};
    }

    await newOpFromRec(data.pop(), data);

    return {};
  }
}
