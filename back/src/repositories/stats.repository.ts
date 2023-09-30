import {AnyObject, DefaultCrudRepository} from '@loopback/repository';
import {Stats, StatsRelations} from '../models';
import {MccbMysqlDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class StatsRepository extends DefaultCrudRepository<
  Stats,
  typeof Stats.prototype.userID,
  StatsRelations
> {
  constructor(
    @inject('datasources.mccb_mysql') dataSource: MccbMysqlDataSource,
  ) {
    super(Stats, dataSource);
  }

  async evolutionSolde(userID: number): Promise<AnyObject> {
    const querySoldeTotal =
      '' +
      'SELECT ROUND(SUM(solde), 2) AS sum ' +
      'FROM Compte ' +
      'WHERE IDuser = ' +
      userID;

    const querySoldeDispo =
      '' +
      'SELECT ROUND(SUM(solde), 2) AS sum ' +
      'FROM Compte ' +
      'WHERE IDuser = ' +
      userID +
      ' AND bloque = 0';

    const queryTotal =
      '' +
      'SELECT ROUND(SUM(MontantOp),2) AS montant, ' +
      "DATE_FORMAT(DateOp, '%Y-%m-%dT00:00:00.000Z') AS date " +
      'FROM Operation NATURAL JOIN Compte ' +
      'WHERE IDuser = ' +
      userID +
      ' ' +
      'GROUP BY date ' +
      'ORDER BY date ASC';

    const queryDispo =
      '' +
      'SELECT ROUND(SUM(MontantOp),2) AS montant, ' +
      "DATE_FORMAT(DateOp, '%Y-%m-%dT00:00:00.000Z') AS date " +
      'FROM Operation NATURAL JOIN Compte ' +
      'WHERE IDuser = ' +
      userID +
      ' AND bloque = 0 ' +
      'GROUP BY date ' +
      'ORDER BY date ASC';

    const soldeTotal = this.execute(querySoldeTotal);
    const soldeDispo = this.execute(querySoldeDispo);
    const dataTotal = this.execute(queryTotal);
    const dataDispo = this.execute(queryDispo);

    const values = await Promise.all([
      soldeTotal,
      soldeDispo,
      dataTotal,
      dataDispo,
    ]);

    return {
      soldeTotal: values[0][0].sum,
      soldeDispo: values[1][0].sum,
      total: values[2],
      dispo: values[3],
    };
  }
}
