'use strict';

const remoteMethods = require('../helpers/remote-methods-name');
const activeMethodExplorer = [];

module.exports = function(Stats) {
  Stats.evolutionSolde = function(UserID, cb) {
    if (!UserID) {
      cb(null, {
        message: 'no user ID',
      });
      return;
    }

    const querySoldeTotal = '' +
      'SELECT ROUND(SUM(solde), 2) AS sum ' +
      'FROM Compte ' +
      'WHERE IDuser = ' + UserID;

    const querySoldeDispo = '' +
      'SELECT ROUND(SUM(solde), 2) AS sum ' +
      'FROM Compte ' +
      'WHERE IDuser = ' + UserID + ' AND bloque = 0';

    const queryTotal = '' +
      'SELECT ROUND(SUM(MontantOp),2) AS montant, ' +
      'DATE_FORMAT(DateOp, \'%Y-%m-%dT00:00:00.000Z\') AS date ' +
      'FROM Operation NATURAL JOIN Compte ' +
      'WHERE IDuser = ' + UserID + ' ' +
      'GROUP BY date ' +
      'ORDER BY date ASC';

    const queryDispo = '' +
      'SELECT ROUND(SUM(MontantOp),2) AS montant, ' +
      'DATE_FORMAT(DateOp, \'%Y-%m-%dT00:00:00.000Z\') AS date ' +
      'FROM Operation NATURAL JOIN Compte ' +
      'WHERE IDuser = ' + UserID + ' AND bloque = 0 ' +
      'GROUP BY date ' +
      'ORDER BY date ASC';

    Stats.dataSource.connector.executeSQL(querySoldeTotal, [], [], (err, soldeTotal) => {
      Stats.dataSource.connector.executeSQL(querySoldeDispo, [], [], (err, soldeDispo) => {
        Stats.dataSource.connector.executeSQL(queryTotal, [], [], (err, dataTotal) => {
          Stats.dataSource.connector.executeSQL(queryDispo, [], [], (err, dataDispo) => {
            cb(null, {
              soldeTotal: soldeTotal[0].sum,
              soldeDispo: soldeDispo[0].sum,
              total: dataTotal,
              dispo: dataDispo,
            });
          });
        });
      });
    });
  };

  remoteMethods.array.forEach(function(method) {
    if (!activeMethodExplorer.includes(method)) {
      Stats.disableRemoteMethodByName(method);
    }
  });

  Stats.remoteMethod('evolutionSolde', {
    accepts: [{
      arg: 'userID',
      type: 'number',
    }],
    returns: {arg: 'results', type: 'object'},
    http: {
      verb: 'get',
    },
  });
};
