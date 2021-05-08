import {DefaultCrudRepository} from '@loopback/repository';
import {Compte, CompteRelations} from '../models';
import {MccbMysqlDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class CompteRepository extends DefaultCrudRepository<
  Compte,
  typeof Compte.prototype.IDcompte,
  CompteRelations
> {
  constructor(
    @inject('datasources.mccb_mysql') dataSource: MccbMysqlDataSource,
  ) {
    super(Compte, dataSource);
  }
}
