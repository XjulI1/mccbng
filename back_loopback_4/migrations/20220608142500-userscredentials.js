'use strict';

let dbm,
  type,
  seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
  return db.createTable('UserCredentials', {
    id: {
      type: 'string',
      id: true,
      generated: false,
    },
    password: {
      type: 'string',
      length: 100
    },
    userId: {
      type: 'string',
      length: 100
    }
  });
};

exports.down = function(db) {
  return db.removeTable('UserCredentials');
};

exports._meta = {
  'version': 1,
};
