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
import {Credit, Operation} from '../models';
import {
  CreditRepository,
  OperationRecurrenteRepository,
  OperationRepository,
} from '../repositories';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';

@authenticate('jwt')
export class CreditController {
  constructor(
    @repository(CreditRepository)
    public creditRepository: CreditRepository,
    @repository(OperationRecurrenteRepository)
    public operationRecurrenteRepository: OperationRecurrenteRepository,
    @repository(OperationRepository)
    public operationRepository: OperationRepository,
  ) {}

  @post('/credits', {
    responses: {
      '200': {
        description: 'Credit model instance',
        content: {'application/json': {schema: getModelSchemaRef(Credit)}},
      },
    },
  })
  async create(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Credit, {
            title: 'NewCredit',
            exclude: ['IDcredit', 'IDopRecu', 'IDuser'],
          }),
        },
      },
    })
    credit: Omit<Credit, 'IDcredit' | 'IDopRecu' | 'IDuser'>,
  ): Promise<Credit> {
    // 1. Get the user ID from the JWT token
    const userID = Number(currentUserProfile[securityId]);

    // 2. Create the credit record with the user ID
    const newCredit = await this.creditRepository.create({
      ...credit,
      IDuser: userID,
    });

    // 3. Calculate first payment date
    const dateDebut = new Date(credit.DateDebut);
    const dernierDateOpRecu = dateDebut.toISOString();

    // 4. Auto-create linked OperationRecurrente
    const opRecu = await this.operationRecurrenteRepository.create({
      NomOpRecu: `Mensualité ${credit.NomCredit}`,
      MontantOpRecu: credit.MontantMensuel,
      JourOpRecu: 1, // Monthly
      JourNumOpRecu: dateDebut.getDate(),
      MoisOpRecu: dateDebut.getMonth(),
      Frequence: 3, // Monthly frequency
      DernierDateOpRecu: dernierDateOpRecu,
      IDcompte: credit.IDcompte,
      IDcat: credit.IDcat || 0,
      IDcredit: newCredit.IDcredit,
    });

    // 5. Update credit with IDopRecu
    await this.creditRepository.updateById(newCredit.IDcredit!, {
      IDopRecu: opRecu.IDopRecu,
    });

    // Return updated credit
    return this.creditRepository.findById(newCredit.IDcredit!);
  }

  @get('/credits/count', {
    responses: {
      '200': {
        description: 'Credit model count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async count(@param.where(Credit) where?: Where<Credit>): Promise<Count> {
    return this.creditRepository.count(where);
  }

  @get('/credits', {
    responses: {
      '200': {
        description: 'Array of Credit model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Credit, {includeRelations: true}),
            },
          },
        },
      },
    },
  })
  async find(@param.filter(Credit) filter?: Filter<Credit>): Promise<Credit[]> {
    return this.creditRepository.find(filter);
  }

  @patch('/credits', {
    responses: {
      '200': {
        description: 'Credit PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Credit, {partial: true}),
        },
      },
    })
    credit: Credit,
    @param.where(Credit) where?: Where<Credit>,
  ): Promise<Count> {
    return this.creditRepository.updateAll(credit, where);
  }

  @get('/credits/{id}', {
    responses: {
      '200': {
        description: 'Credit model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Credit, {includeRelations: true}),
          },
        },
      },
    },
  })
  async findById(
    @param.path.number('id') id: number,
    @param.filter(Credit, {exclude: 'where'})
    filter?: FilterExcludingWhere<Credit>,
  ): Promise<Credit> {
    return this.creditRepository.findById(id, filter);
  }

  @patch('/credits/{id}', {
    responses: {
      '204': {
        description: 'Credit PATCH success',
      },
    },
  })
  async updateById(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Credit, {partial: true}),
        },
      },
    })
    credit: Credit,
  ): Promise<void> {
    await this.creditRepository.updateById(id, credit);
  }

  @put('/credits/{id}', {
    responses: {
      '204': {
        description: 'Credit PUT success',
      },
    },
  })
  async replaceById(
    @param.path.number('id') id: number,
    @requestBody() credit: Credit,
  ): Promise<void> {
    await this.creditRepository.replaceById(id, credit);
  }

  @del('/credits/{id}', {
    responses: {
      '204': {
        description: 'Credit DELETE success',
      },
    },
  })
  async deleteById(@param.path.number('id') id: number): Promise<void> {
    // 1. Get the credit
    const credit = await this.creditRepository.findById(id);

    // 2. Delete linked OperationRecurrente if exists
    if (credit.IDopRecu) {
      try {
        await this.operationRecurrenteRepository.deleteById(credit.IDopRecu);
      } catch (error) {
        // OperationRecurrente might not exist, continue
      }
    }

    // 3. Unlink operations (set IDcredit = NULL) instead of deleting them
    await this.operationRepository.updateAll(
      {IDcredit: undefined},
      {IDcredit: id},
    );

    // 4. Delete the credit
    await this.creditRepository.deleteById(id);
  }

  @get('/credits/{id}/remaining-balance', {
    responses: {
      '200': {
        description: 'Remaining balance for a credit',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                solde: {type: 'number'},
                paye: {type: 'number'},
              },
            },
          },
        },
      },
    },
  })
  async getRemainingBalance(
    @param.path.number('id') id: number,
  ): Promise<{solde: number; paye: number}> {
    const credit = await this.creditRepository.findById(id);

    const sql = `
      SELECT COALESCE(SUM(MontantOp), 0) as TotalPaye
      FROM Operation
      WHERE IDcredit = ${id}
    `;

    const result = await this.operationRepository.execute(sql);
    const totalPaye = result[0]?.TotalPaye || 0;

    return {
      solde: credit.MontantInitial + totalPaye, // totalPaye is negative
      paye: Math.abs(totalPaye),
    };
  }

  @get('/credits/{id}/payments', {
    responses: {
      '200': {
        description: 'List of payment operations for a credit',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Operation),
            },
          },
        },
      },
    },
  })
  async getPayments(
    @param.path.number('id') id: number,
  ): Promise<Operation[]> {
    return this.operationRepository.find({
      where: {IDcredit: id},
      order: ['DateOp DESC'],
    });
  }

  @get('/credits/by-user/{userID}', {
    responses: {
      '200': {
        description: 'Array of credits for a user',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Credit),
            },
          },
        },
      },
    },
  })
  async getCreditsByUser(
    @param.path.number('userID') userID: number,
  ): Promise<Credit[]> {
    return this.creditRepository.find({
      where: {IDuser: userID},
      order: ['DateDebut DESC'],
    });
  }
}
