exports.up = function(knex) {
  return knex.schema.table('usuarios', function(table) {
    table.string('rol', 20).defaultTo('user');
    table.check('?? IN (?)', ['rol', ['user', 'admin', 'moderator']]);
  });
};

exports.down = function(knex) {
  return knex.schema.table('usuarios', function(table) {
    table.dropColumn('rol');
  });
};
