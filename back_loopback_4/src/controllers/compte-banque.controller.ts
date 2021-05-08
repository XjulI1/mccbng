import {
  repository,
} from '@loopback/repository';
import {
  param,
  get,
  getModelSchemaRef,
} from '@loopback/rest';
import {
  Compte,
  Banque,
} from '../models';
import {CompteRepository} from '../repositories';

export class CompteBanqueController {
  constructor(
    @repository(CompteRepository)
    public compteRepository: CompteRepository,
  ) { }

  @get('/comptes/{id}/banque', {
    responses: {
      '200': {
        description: 'Banque belonging to Compte',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Banque)},
          },
        },
      },
    },
  })
  async getBanque(
    @param.path.number('id') id: typeof Compte.prototype.IDcompte,
  ): Promise<Banque> {
    return this.compteRepository.banque(id);
  }
}
