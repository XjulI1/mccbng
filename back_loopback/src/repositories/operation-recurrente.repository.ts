import {DefaultCrudRepository} from '@loopback/repository';
import {OperationRecurrente, OperationRecurrenteRelations} from '../models';
import {MccbMysqlDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class OperationRecurrenteRepository extends DefaultCrudRepository<
  OperationRecurrente,
  typeof OperationRecurrente.prototype.IDopRecu,
  OperationRecurrenteRelations
> {
  constructor(
    @inject('datasources.mccb_mysql') dataSource: MccbMysqlDataSource,
  ) {
    super(OperationRecurrente, dataSource);
  }
}
