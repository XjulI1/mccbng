import {DefaultCrudRepository} from '@loopback/repository';
import {GoCardlessAccount, GoCardlessAccountRelations} from '../models';
import {MccbMysqlDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class GoCardlessAccountRepository extends DefaultCrudRepository<
  GoCardlessAccount,
  typeof GoCardlessAccount.prototype.id,
  GoCardlessAccountRelations
> {
  constructor(
    @inject('datasources.mccb_mysql') dataSource: MccbMysqlDataSource,
  ) {
    super(GoCardlessAccount, dataSource);
  }
}
