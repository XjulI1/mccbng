import {repository} from '@loopback/repository';
import {param, get, getModelSchemaRef, HttpErrors} from '@loopback/rest';
import {Compte, Banque} from '../models';
import {CompteRepository} from '../repositories';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {getCurrentUserId} from '../services/current-user';

@authenticate('jwt')
export class CompteBanqueController {
  constructor(
    @repository(CompteRepository)
    public compteRepository: CompteRepository,
  ) {}

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
    @inject(SecurityBindings.USER) currentUserProfile: UserProfile,
    @param.path.number('id') id: typeof Compte.prototype.IDcompte,
  ): Promise<Banque> {
    const IDuser = getCurrentUserId(currentUserProfile);
    const compte = await this.compteRepository.findOne({
      where: {IDcompte: id, IDuser},
    });
    if (!compte) {
      throw new HttpErrors.NotFound(`Compte ${id} not found`);
    }
    return this.compteRepository.banque(id);
  }
}
