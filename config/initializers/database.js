const Sequelize = require('sequelize');
require('sequelize-hierarchy')(Sequelize);
const dotenv = require('dotenv').config();

const UserModel = require('../../src/models/user');
const DbConfig = require("../config.json");


const instance = new Sequelize(dotenv.parsed.RDS_DBNAME, dotenv.parsed.RDS_USERNAME, dotenv.parsed.RDS_PASSWORD, {
    host: dotenv.parsed.RDS_HOSTNAME,
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
