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

  // Sum of MontantOp grouped by month for two years, restricted to the user's
  // accounts and to categories flagged for stats. Returns 12-slot arrays
  // (Jan -> Dec) plus the percentage delta of yearB vs yearA per month.
  async yearComparison(
    userID: number,
    compteIds: number[],
    yearA: number,
    yearB: number,
  ): Promise<AnyObject> {
    if (compteIds.length === 0) {
      return {
        yearA: new Array(12).fill(0),
        yearB: new Array(12).fill(0),
        deltaPct: new Array(12).fill(null),
      };
    }
    const placeholders = new Array(compteIds.length).fill('?').join(',');
    const sql =
      'SELECT YEAR(DateOp) AS y, MONTH(DateOp) AS m, ' +
      'ROUND(SUM(MontantOp), 2) AS total ' +
      'FROM Operation ' +
      `WHERE IDcompte IN (${placeholders}) ` +
      'AND YEAR(DateOp) IN (?, ?) ' +
      'AND IDcat IN ' +
      '(SELECT IDcat FROM Categorie WHERE Stats = 1 AND IDuser IN (0, ?)) ' +
      'GROUP BY YEAR(DateOp), MONTH(DateOp)';

    const params = [...compteIds, yearA, yearB, userID];
    const rows = (await this.execute(sql, params)) as Array<{
      y: number | string;
      m: number | string;
      total: number | string;
    }>;

    const seriesA = new Array(12).fill(0);
    const seriesB = new Array(12).fill(0);
    for (const row of rows) {
      const idx = Number(row.m) - 1;
      if (Number(row.y) === yearA) seriesA[idx] = Number(row.total) || 0;
      if (Number(row.y) === yearB) seriesB[idx] = Number(row.total) || 0;
    }

    const deltaPct = seriesA.map((a, i) => {
      if (!a) return null;
      return Math.round(((seriesB[i] - a) / Math.abs(a)) * 10000) / 100;
    });

    return {yearA: seriesA, yearB: seriesB, deltaPct};
  }

  // Top spending categories on a date range. Expenses are negative so we sort
  // ASC (largest expense first). Filters out non-stats categories.
  async topCategories(
    userID: number,
    compteIds: number[],
    from: string,
    to: string,
    limit: number,
  ): Promise<AnyObject> {
    if (compteIds.length === 0) return [];
    const placeholders = new Array(compteIds.length).fill('?').join(',');
    const sql =
      'SELECT o.IDcat AS IDcat, c.Nom AS libelle, ' +
      'ROUND(SUM(o.MontantOp), 2) AS total ' +
      'FROM Operation o ' +
      'INNER JOIN Categorie c ON c.IDcat = o.IDcat ' +
      `WHERE o.IDcompte IN (${placeholders}) ` +
      'AND o.DateOp >= ? AND o.DateOp <= ? ' +
      'AND c.Stats = 1 AND c.IDuser IN (0, ?) ' +
      'GROUP BY o.IDcat, c.Nom ' +
      'ORDER BY total ASC ' +
      'LIMIT ?';

    return this.execute(sql, [...compteIds, from, to, userID, limit]);
  }

  // Splits monthly totals into income (MontantOp > 0) and expense (< 0).
  async incomeVsExpense(
    userID: number,
    compteIds: number[],
    yearNumber: number,
  ): Promise<AnyObject> {
    if (compteIds.length === 0) {
      return {
        income: new Array(12).fill(0),
        expense: new Array(12).fill(0),
      };
    }
    const placeholders = new Array(compteIds.length).fill('?').join(',');
    const sql =
      'SELECT MONTH(DateOp) AS m, ' +
      'ROUND(SUM(CASE WHEN MontantOp > 0 THEN MontantOp ELSE 0 END), 2) AS income, ' +
      'ROUND(SUM(CASE WHEN MontantOp < 0 THEN MontantOp ELSE 0 END), 2) AS expense ' +
      'FROM Operation ' +
      `WHERE IDcompte IN (${placeholders}) ` +
      'AND YEAR(DateOp) = ? ' +
      'AND IDcat IN ' +
      '(SELECT IDcat FROM Categorie WHERE Stats = 1 AND IDuser IN (0, ?)) ' +
      'GROUP BY MONTH(DateOp)';

    const rows = (await this.execute(sql, [
      ...compteIds,
      yearNumber,
      userID,
    ])) as Array<{
      m: number | string;
      income: number | string;
      expense: number | string;
    }>;

    const income = new Array(12).fill(0);
    const expense = new Array(12).fill(0);
    for (const row of rows) {
      const idx = Number(row.m) - 1;
      income[idx] = Number(row.income) || 0;
      expense[idx] = Number(row.expense) || 0;
    }
    return {income, expense};
  }

  // Largest operations (in absolute value) over a date range.
  async topOperations(
    compteIds: number[],
    from: string,
    to: string,
    limit: number,
  ): Promise<AnyObject> {
    if (compteIds.length === 0) return [];
    const placeholders = new Array(compteIds.length).fill('?').join(',');
    const sql =
      'SELECT IDop, NomOp, MontantOp, DateOp, IDcat, IDcompte ' +
      'FROM Operation ' +
      `WHERE IDcompte IN (${placeholders}) ` +
      'AND DateOp >= ? AND DateOp <= ? ' +
      'ORDER BY ABS(MontantOp) DESC ' +
      'LIMIT ?';

    return this.execute(sql, [...compteIds, from, to, limit]);
  }

  // Heatmap matrix: month (0-11) x category. Returns the per-cell total
  // already shaped as Highcharts heatmap input plus the category index.
  async categoryHeatmap(
    userID: number,
    compteIds: number[],
    yearNumber: number,
  ): Promise<AnyObject> {
    if (compteIds.length === 0) {
      return {categories: [], data: []};
    }
    const placeholders = new Array(compteIds.length).fill('?').join(',');

    const sql =
      'SELECT MONTH(o.DateOp) AS m, o.IDcat AS IDcat, c.Nom AS libelle, ' +
      'ROUND(SUM(o.MontantOp), 2) AS total ' +
      'FROM Operation o ' +
      'INNER JOIN Categorie c ON c.IDcat = o.IDcat ' +
      `WHERE o.IDcompte IN (${placeholders}) ` +
      'AND YEAR(o.DateOp) = ? ' +
      'AND c.Stats = 1 AND c.IDuser IN (0, ?) ' +
      'GROUP BY MONTH(o.DateOp), o.IDcat, c.Nom';

    const rows = (await this.execute(sql, [
      ...compteIds,
      yearNumber,
      userID,
    ])) as Array<{
      m: number | string;
      IDcat: number | string;
      libelle: string;
      total: number | string;
    }>;

    // Build the unique category list ordered by total expense desc so the most
    // significant rows appear first in the heatmap.
    const totalsByCat = new Map<number, {libelle: string; total: number}>();
    for (const row of rows) {
      const id = Number(row.IDcat);
      const total = Number(row.total) || 0;
      const existing = totalsByCat.get(id);
      if (existing) {
        existing.total += total;
      } else {
        totalsByCat.set(id, {libelle: row.libelle, total});
      }
    }
    const categories = [...totalsByCat.entries()]
      .sort((a, b) => a[1].total - b[1].total) // most-spent (most negative) first
      .map(([id, {libelle}]) => ({IDcat: id, libelle}));

    const catIndex = new Map(categories.map((c, i) => [c.IDcat, i]));
    const data: [number, number, number][] = [];
    for (const row of rows) {
      const idx = catIndex.get(Number(row.IDcat));
      if (idx === undefined) continue;
      data.push([Number(row.m) - 1, idx, Number(row.total) || 0]);
    }

    return {categories, data};
  }
}
