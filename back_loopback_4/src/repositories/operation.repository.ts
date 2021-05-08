import {DefaultCrudRepository} from '@loopback/repository';
import {Operation, OperationRelations} from '../models';
import {MccbMysqlDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class OperationRepository extends DefaultCrudRepository<
  Operation,
  typeof Operation.prototype.IDop,
  OperationRelations
> {
  constructor(
    @inject('datasources.mccb_mysql') dataSource: MccbMysqlDataSource,
  ) {
    super(Operation, dataSource);
  }
}
