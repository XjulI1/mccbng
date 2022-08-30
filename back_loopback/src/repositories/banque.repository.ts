import {DefaultCrudRepository} from '@loopback/repository';
import {Banque, BanqueRelations} from '../models';
import {MccbMysqlDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class BanqueRepository extends DefaultCrudRepository<
  Banque,
  typeof Banque.prototype.IDbanque,
  BanqueRelations
> {
  constructor(
    @inject('datasources.mccb_mysql') dataSource: MccbMysqlDataSource,
  ) {
    super(Banque, dataSource);
  }
}
