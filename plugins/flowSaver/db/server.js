const knex = appRequire('init/knex').knex;
const tableName = 'server';
const config = appRequire('services/config').all();
const manager = appRequire('services/manager');
const log4js = require('log4js');
const logger = log4js.getLogger('flowSaver');

const createTable = async () => {
  if(config.empty) {
    await knex.schema.dropTableIfExists(tableName);
  }
  await knex.schema.createTableIfNotExists(tableName, function(table) {
    table.increments('id');
    table.string('name');
    table.string('host');
    table.integer('port');
    table.string('password');
    table.float('scale').defaultTo(1);
    table.integer('allot').defaultTo(0);
    table.string('method').defaultTo('aes-256-cfb');
  });
  const hasColumnScale = await knex.schema.hasColumn(tableName, 'scale');
  if(!hasColumnScale) {
    await knex.schema.table(tableName, function(table) {
      table.float('scale').defaultTo(1);
    });
  }
  knex.schema.hasColumn(tableName, 'allot')
    .then((exists) => {
      if(!exists){
        return knex.schema.table(tableName, function (table) {
          table.integer('allot').defaultTo(0);
        })
      }
    });
  const list = await knex('server').select(['name', 'host', 'port', 'password']);
  if(list.length === 0) {
    const host = config.manager.address.split(':')[0];
    const port = +config.manager.address.split(':')[1];
    const password = config.manager.password;
    await manager.send({
      command: 'flow',
      options: {
        clear: false,
      },
    }, {
      host,
      port,
      password,
    }).catch(() => {
      logger.error(`connect to server ${ password }@${ host }:${ port } fail.`);
      process.exit(1);
    });
    await knex('server').insert({
      name: 'default',
      host,
      port,
      password,
      allot: 1,
    });
  }
  return;
};

exports.createTable = createTable;
