import {DefaultCrudRepository} from '@loopback/repository';
import {Credit, CreditRelations} from '../models';
import {MccbMysqlDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class CreditRepository extends DefaultCrudRepository<
  Credit,
  typeof Credit.prototype.IDcredit,
  CreditRelations
> {
  constructor(
    @inject('datasources.mccb_mysql') dataSource: MccbMysqlDataSource,
  ) {
    super(Credit, dataSource);
  }
}
