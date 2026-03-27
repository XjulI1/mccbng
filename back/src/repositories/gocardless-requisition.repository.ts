import {DefaultCrudRepository} from '@loopback/repository';
import {GoCardlessRequisition, GoCardlessRequisitionRelations} from '../models';
import {MccbMysqlDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class GoCardlessRequisitionRepository extends DefaultCrudRepository<
  GoCardlessRequisition,
  typeof GoCardlessRequisition.prototype.id,
  GoCardlessRequisitionRelations
> {
  constructor(
    @inject('datasources.mccb_mysql') dataSource: MccbMysqlDataSource,
  ) {
    super(GoCardlessRequisition, dataSource);
  }
}
