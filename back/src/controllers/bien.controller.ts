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
import {Bien} from '../models';
import {BienRepository, CreditRepository} from '../repositories';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {getCurrentUserId} from '../services/current-user';

@authenticate('jwt')
export class BienController {
  constructor(
    @repository(BienRepository)
    public bienRepository: BienRepository,
    @repository(CreditRepository)
    public creditRepository: CreditRepository,
  ) {}

  private scope(
    currentUserProfile: UserProfile,
    where?: Where<Bien>,
  ): Where<Bien> {
    const IDuser = getCurrentUserId(currentUserProfile);
    const userScope: Where<Bien> = {IDuser};
    return where ? {and: [where, userScope]} : userScope;
  }

  private async assertOwned(
    id: number,
    currentUserProfile: UserProfile,
  ): Promise<Bien> {
    const IDuser = getCurrentUserId(currentUserProfile);
    const bien = await this.bienRepository.findOne({
      where: {IDbien: id, IDuser},
    });
    if (!bien) {
      throw new HttpErrors.NotFound(`Bien ${id} not found`);
    }
    return bien;
  }

  private async assertCreditOwned(
    creditID: number,
    currentUserProfile: UserProfile,
  ): Promise<void> {
    const IDuser = getCurrentUserId(currentUserProfile);
    const credit = await this.creditRepository.findOne({
      where: {IDcredit: creditID, IDuser},
    });
    if (!credit) {
      throw new HttpErrors.NotFound(`Credit ${creditID} not found`);
    }
  }

  @post('/biens', {
    responses: {
      '200': {
        description: 'Bien model instance',
        content: {'application/json': {schema: getModelSchemaRef(Bien)}},
      },
    },
  })
  async create(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Bien, {
            title: 'NewBien',
            exclude: ['IDbien', 'IDuser'],
          }),
        },
      },
    })
    bien: Omit<Bien, 'IDbien' | 'IDuser'>,
  ): Promise<Bien> {
    const userID = getCurrentUserId(currentUserProfile);
    if (bien.IDcredit) {
      await this.assertCreditOwned(bien.IDcredit, currentUserProfile);
    }
    return this.bienRepository.create({
      ...bien,
      IDuser: userID,
    });
  }

  @get('/biens/count', {
    responses: {
      '200': {
        description: 'Bien model count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async count(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.where(Bien) where?: Where<Bien>,
  ): Promise<Count> {
    return this.bienRepository.count(this.scope(currentUserProfile, where));
  }

  @get('/biens', {
    responses: {
      '200': {
        description: 'Array of Bien model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Bien, {includeRelations: true}),
            },
          },
        },
      },
    },
  })
  async find(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @param.filter(Bien) filter?: Filter<Bien>,
  ): Promise<Bien[]> {
    return this.bienRepository.find({
      ...filter,
      where: this.scope(currentUserProfile, filter?.where),
    });
  }

  @patch('/biens', {
    responses: {
      '200': {
        description: 'Bien PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async updateAll(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Bien, {
            partial: true,
            exclude: ['IDuser'],
          }),
        },
      },
    })
    bien: Omit<Bien, 'IDuser'>,
    @param.where(Bien) where?: Where<Bien>,
  ): Promise<Count> {
    if (bien.IDcredit) {
      await this.assertCreditOwned(bien.IDcredit, currentUserProfile);
    }
    return this.bienRepository.updateAll(
      bien,
      this.scope(currentUserProfile, where),
    );
  }

  @get('/biens/{id}', {
    responses: {
      '200': {
        description: 'Bien model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Bien, {includeRelations: true}),
          },
        },
      },
    },
  })
  async findById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
    @param.filter(Bien, {exclude: 'where'})
    filter?: FilterExcludingWhere<Bien>,
  ): Promise<Bien> {
    await this.assertOwned(id, currentUserProfile);
    return this.bienRepository.findById(id, filter);
  }

  @patch('/biens/{id}', {
    responses: {
      '204': {
        description: 'Bien PATCH success',
      },
    },
  })
  async updateById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Bien, {
            partial: true,
            exclude: ['IDuser'],
          }),
        },
      },
    })
    bien: Omit<Bien, 'IDuser'>,
  ): Promise<void> {
    await this.assertOwned(id, currentUserProfile);
    if (bien.IDcredit) {
      await this.assertCreditOwned(bien.IDcredit, currentUserProfile);
    }
    await this.bienRepository.updateById(id, bien);
  }

  @put('/biens/{id}', {
    responses: {
      '204': {
        description: 'Bien PUT success',
      },
    },
  })
  async replaceById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
    @requestBody() bien: Bien,
  ): Promise<void> {
    await this.assertOwned(id, currentUserProfile);
    if (bien.IDcredit) {
      await this.assertCreditOwned(bien.IDcredit, currentUserProfile);
    }
    bien.IDuser = getCurrentUserId(currentUserProfile);
    await this.bienRepository.replaceById(id, bien);
  }

  @del('/biens/{id}', {
    responses: {
      '204': {
        description: 'Bien DELETE success',
      },
    },
  })
  async deleteById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
  ): Promise<void> {
    await this.assertOwned(id, currentUserProfile);
    await this.bienRepository.deleteById(id);
  }
}
