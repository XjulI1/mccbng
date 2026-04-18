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
import {Categorie} from '../models';
import {CategorieRepository} from '../repositories';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {getCurrentUserId} from '../services/current-user';

@authenticate('jwt')
export class CategoriesController {
  constructor(
    @repository(CategorieRepository)
    public categorieRepository: CategorieRepository,
  ) {}

  // Read scope: user-owned categories OR shared ones (IDuser = 0)
  private readScope(
    currentUserProfile: UserProfile,
    where?: Where<Categorie>,
  ): Where<Categorie> {
    const IDuser = getCurrentUserId(currentUserProfile);
    const userScope: Where<Categorie> = {IDuser: {inq: [0, IDuser]}};
    return where ? {and: [where, userScope]} : userScope;
  }

  // Write scope: user-owned categories only; shared categories cannot be
  // mutated by users.
  private writeScope(
    currentUserProfile: UserProfile,
    where?: Where<Categorie>,
  ): Where<Categorie> {
    const IDuser = getCurrentUserId(currentUserProfile);
    return where ? {and: [where, {IDuser}]} : {IDuser};
  }

  private async assertOwned(
    id: number,
    currentUserProfile: UserProfile,
  ): Promise<void> {
    const IDuser = getCurrentUserId(currentUserProfile);
    const cat = await this.categorieRepository.findOne({
      where: {IDcat: id, IDuser},
    });
    if (!cat) {
      throw new HttpErrors.NotFound(`Categorie ${id} not found`);
    }
  }

  @post('/categories', {
    responses: {
      '200': {
        description: 'Categorie model instance',
        content: {'application/json': {schema: getModelSchemaRef(Categorie)}},
      },
    },
  })
  async create(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Categorie, {
            title: 'NewCategorie',
            exclude: ['IDcat', 'IDuser'],
          }),
        },
      },
    })
    categorie: Omit<Categorie, 'IDcat' | 'IDuser'>,
  ): Promise<Categorie> {
    return this.categorieRepository.create({
      ...categorie,
      IDuser: getCurrentUserId(currentUserProfile),
    });
  }

  @get('/categories/count', {
    responses: {
      '200': {
        description: 'Categorie model count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async count(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.where(Categorie) where?: Where<Categorie>,
  ): Promise<Count> {
    return this.categorieRepository.count(
      this.readScope(currentUserProfile, where),
    );
  }

  @get('/categories', {
    responses: {
      '200': {
        description: 'Array of Categorie model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Categorie, {includeRelations: true}),
            },
          },
        },
      },
    },
  })
  async find(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.filter(Categorie) filter?: Filter<Categorie>,
  ): Promise<Categorie[]> {
    return this.categorieRepository.find({
      ...filter,
      where: this.readScope(currentUserProfile, filter?.where),
    });
  }

  @patch('/categories', {
    responses: {
      '200': {
        description: 'Categorie PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async updateAll(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Categorie, {
            partial: true,
            exclude: ['IDuser'],
          }),
        },
      },
    })
    categorie: Omit<Categorie, 'IDuser'>,
    @param.where(Categorie) where?: Where<Categorie>,
  ): Promise<Count> {
    return this.categorieRepository.updateAll(
      categorie,
      this.writeScope(currentUserProfile, where),
    );
  }

  @get('/categories/{id}', {
    responses: {
      '200': {
        description: 'Categorie model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Categorie, {includeRelations: true}),
          },
        },
      },
    },
  })
  async findById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
    @param.filter(Categorie, {exclude: 'where'})
    filter?: FilterExcludingWhere<Categorie>,
  ): Promise<Categorie> {
    const IDuser = getCurrentUserId(currentUserProfile);
    const cat = await this.categorieRepository.findOne({
      ...filter,
      where: {IDcat: id, IDuser: {inq: [0, IDuser]}},
    });
    if (!cat) {
      throw new HttpErrors.NotFound(`Categorie ${id} not found`);
    }
    return cat;
  }

  @patch('/categories/{id}', {
    responses: {
      '204': {
        description: 'Categorie PATCH success',
      },
    },
  })
  async updateById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Categorie, {
            partial: true,
            exclude: ['IDuser'],
          }),
        },
      },
    })
    categorie: Omit<Categorie, 'IDuser'>,
  ): Promise<void> {
    await this.assertOwned(id, currentUserProfile);
    await this.categorieRepository.updateById(id, categorie);
  }

  @put('/categories/{id}', {
    responses: {
      '204': {
        description: 'Categorie PUT success',
      },
    },
  })
  async replaceById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
    @requestBody() categorie: Categorie,
  ): Promise<void> {
    await this.assertOwned(id, currentUserProfile);
    categorie.IDuser = getCurrentUserId(currentUserProfile);
    await this.categorieRepository.replaceById(id, categorie);
  }

  @del('/categories/{id}', {
    responses: {
      '204': {
        description: 'Categorie DELETE success',
      },
    },
  })
  async deleteById(
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: number,
  ): Promise<void> {
    await this.assertOwned(id, currentUserProfile);
    await this.categorieRepository.deleteById(id);
  }
}
