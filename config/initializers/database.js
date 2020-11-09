const Sequelize = require('sequelize');
require('sequelize-hierarchy')(Sequelize);

const UserModel = require('../../src/models/user');
const DbConfig = require("../config.json");


const instance = new Sequelize(DbConfig.development.database, DbConfig.development.username, DbConfig.development.password, {
    host: DbConfig.development.host,
    dialect: 'mysql',
    operatorsAliases: 0,
    logging: console.log,
    pool: {
      max: 20,
      min: 0,
      acquire: 60000,
      idle: 10000
    }
});

const Users = UserModel(instance, Sequelize);
console.log(Users);
console.log("Model created");

instance
    .authenticate()
    .then(() => console.log('Connected to auth database'))
    .catch((err) => console.log(err));

module.exports = {
    instance,
    Sequelize,
    Users
}
