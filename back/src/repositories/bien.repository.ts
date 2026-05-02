import {DefaultCrudRepository} from '@loopback/repository';
import {Bien, BienRelations} from '../models';
import {MccbMysqlDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class BienRepository extends DefaultCrudRepository<
  Bien,
  typeof Bien.prototype.IDbien,
  BienRelations
> {
  constructor(
    @inject('datasources.mccb_mysql') dataSource: MccbMysqlDataSource,
  ) {
    super(Bien, dataSource);
  }
}
