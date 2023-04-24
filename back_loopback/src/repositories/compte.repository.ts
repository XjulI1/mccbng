import {
  DefaultCrudRepository,
  repository,
  BelongsToAccessor,
} from '@loopback/repository';
import {Compte, CompteRelations, Banque} from '../models';
import {MccbMysqlDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {BanqueRepository} from './banque.repository';

export class CompteRepository extends DefaultCrudRepository<
  Compte,
  typeof Compte.prototype.IDcompte,
  CompteRelations
> {
  public readonly banque: BelongsToAccessor<
    Banque,
    typeof Compte.prototype.IDcompte
  >;

  constructor(
    @inject('datasources.mccb_mysql') dataSource: MccbMysqlDataSource,
    @repository.getter('BanqueRepository')
    protected banqueRepositoryGetter: Getter<BanqueRepository>,
  ) {
    super(Compte, dataSource);
    this.banque = this.createBelongsToAccessorFor(
      'banque',
      banqueRepositoryGetter,
    );
    this.registerInclusionResolver('banque', this.banque.inclusionResolver);
  }
}
