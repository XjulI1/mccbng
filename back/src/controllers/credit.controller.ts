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
import {Credit, Operation} from '../models';
import {
  CompteRepository,
  CreditRepository,
  OperationRecurrenteRepository,
  OperationRepository,
} from '../repositories';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {getCurrentUserId} from '../services/current-user';

@authenticate('jwt')
export class CreditController {
  constructor(
    @repository(CreditRepository)
    public creditRepository: CreditRepository,
    @repository(OperationRecurrenteRepository)
    public operationRecurrenteRepository: OperationRecurrenteRepository,
    @repository(OperationRepository)
    public operationRepository: OperationRepository,
    @repository(CompteRepository)
    public compteRepository: CompteRepository,
  ) {}

  private scope(
    currentUserProfile: UserProfile,
    where?: Where<Credit>,
  ): Where<Credit> {
    const IDuser = getCurrentUserId(currentUserProfile);
    const userScope: Where<Credit> = {IDuser};
    return where ? {and: [where, userScope]} : userScope;
  }

  private async assertOwned(
    id: number,
    currentUserProfile: UserProfile,
  ): Promise<Credit> {
    const IDuser = getCurrentUserId(currentUserProfile);
    const credit = await this.creditRepository.findOne({
      where: {IDcredit: id, IDuser},
    });
    if (!credit) {
      throw new HttpErrors.NotFound(`Credit ${id} not found`);
    }
    return credit;
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
    const userID = getCurrentUserId(currentUserProfile);
    await this.assertCompteOwned(credit.IDcompte, currentUserProfile);

    const newCredit = await this.creditRepository.create({
      ...credit,
      IDuser: userID,
    });

    const dateDebut = new Date(credit.DateDebut);
    const dernierDateOpRecu = dateDebut.toISOString();

    const opRecu = await this.operationRecurrenteRepository.create({
      NomOpRecu: `Mensualité ${credit.NomCredit}`,
      MontantOpRecu: credit.MontantMensuel,
      JourOpRecu: 1,
      JourNumOpRecu: dateDebut.getDate(),
      MoisOpRecu: dateDebut.getMonth(),
      Frequence: 3,
      DernierDateOpRecu: dernierDateOpRecu,
      IDcompte: credit.IDcompte,
      IDcat: credit.IDcat || 0,
      IDcredit: newCredit.IDcredit,
    });

    await this.creditRepository.updateById(newCredit.IDcredit!, {
      IDopRecu: opRecu.IDopRecu,
    });

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
  async count(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.where(Credit) where?: Where<Credit>,
  ): Promise<Count> {
    return this.creditRepository.count(this.scope(currentUserProfile, where));
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
  async find(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @param.filter(Credit) filter?: Filter<Credit>,
  ): Promise<Credit[]> {
    return this.creditRepository.find({
      ...filter,
      where: this.scope(currentUserProfile, filter?.where),
    });
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
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
    delete credit.IDuser;
    if (credit.IDcompte !== undefined) {
      await this.assertCompteOwned(credit.IDcompte, currentUserProfile);
    }
    return this.creditRepository.updateAll(
      credit,
      this.scope(currentUserProfile, where),
    );
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
    @param.filter(Credit, {exclude: 'where'})
    filter?: FilterExcludingWhere<Credit>,
  ): Promise<Credit> {
    await this.assertOwned(id, currentUserProfile);
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
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
    await this.assertOwned(id, currentUserProfile);
    delete credit.IDuser;
    if (credit.IDcompte !== undefined) {
      await this.assertCompteOwned(credit.IDcompte, currentUserProfile);
    }
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
    @requestBody() credit: Credit,
  ): Promise<void> {
    await this.assertOwned(id, currentUserProfile);
    await this.assertCompteOwned(credit.IDcompte, currentUserProfile);
    credit.IDuser = getCurrentUserId(currentUserProfile);
    await this.creditRepository.replaceById(id, credit);
  }

  @del('/credits/{id}', {
    responses: {
      '204': {
        description: 'Credit DELETE success',
      },
    },
  })
  async deleteById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
  ): Promise<void> {
    const credit = await this.assertOwned(id, currentUserProfile);

    if (credit.IDopRecu) {
      try {
        await this.operationRecurrenteRepository.deleteById(credit.IDopRecu);
      } catch (error) {
        // OperationRecurrente might not exist, continue
      }
    }

    await this.operationRepository.updateAll(
      {IDcredit: undefined},
      {IDcredit: id},
    );

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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
  ): Promise<{solde: number; paye: number}> {
    const credit = await this.assertOwned(id, currentUserProfile);

    const sql = `
      SELECT COALESCE(SUM(MontantOp), 0) as TotalPaye
      FROM Operation
      WHERE IDcredit = ?
    `;

    const result = await this.operationRepository.execute(sql, [id]);
    const totalPaye = result[0]?.TotalPaye || 0;

    return {
      solde: credit.MontantInitial + totalPaye,
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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
  ): Promise<Operation[]> {
    await this.assertOwned(id, currentUserProfile);
    return this.operationRepository.find({
      where: {IDcredit: id},
      order: ['DateOp DESC'],
    });
  }
}
