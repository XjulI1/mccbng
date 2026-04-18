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
    const querySoldeGlobal =
      'SELECT ROUND(SUM(solde), 2) AS sum ' +
      'FROM Compte ' +
      'WHERE retraite = 0 AND children = 0 AND IDuser = ?';

    const querySoldeRetraite =
      'SELECT ROUND(SUM(solde), 2) AS sum ' +
      'FROM Compte ' +
      'WHERE retraite = 1 AND IDuser = ?';

    const querySoldeDispo =
      'SELECT ROUND(SUM(solde), 2) AS sum ' +
      'FROM Compte ' +
      'WHERE IDuser = ? AND bloque = 0';

    const queryGlobal =
      'SELECT ROUND(SUM(MontantOp),2) AS montant, ' +
      "DATE_FORMAT(DateOp, '%Y-%m-%dT00:00:00.000Z') AS date " +
      'FROM Operation NATURAL JOIN Compte ' +
      'WHERE IDuser = ? AND retraite = 0 AND children = 0 ' +
      'GROUP BY date ' +
      'ORDER BY date ASC';

    const queryRetraite =
      'SELECT ROUND(SUM(MontantOp),2) AS montant, ' +
      "DATE_FORMAT(DateOp, '%Y-%m-%dT00:00:00.000Z') AS date " +
      'FROM Operation NATURAL JOIN Compte ' +
      'WHERE IDuser = ? AND retraite = 1 ' +
      'GROUP BY date ' +
      'ORDER BY date ASC';

    const queryDispo =
      'SELECT ROUND(SUM(MontantOp),2) AS montant, ' +
      "DATE_FORMAT(DateOp, '%Y-%m-%dT00:00:00.000Z') AS date " +
      'FROM Operation NATURAL JOIN Compte ' +
      'WHERE IDuser = ? AND bloque = 0 ' +
      'GROUP BY date ' +
      'ORDER BY date ASC';

    const params = [userID];

    const values = await Promise.all([
      this.execute(querySoldeGlobal, params),
      this.execute(querySoldeRetraite, params),
      this.execute(querySoldeDispo, params),
      this.execute(queryGlobal, params),
      this.execute(queryRetraite, params),
      this.execute(queryDispo, params),
    ]);

    return {
      soldeGlobal: values[0][0].sum,
      soldeRetraite: values[1][0].sum,
      soldeDispo: values[2][0].sum,
      global: values[3],
      retraite: values[4],
      dispo: values[5],
    };
  }
}
