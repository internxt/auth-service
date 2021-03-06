const Sequelize = require('sequelize');
const jwt = require('jsonwebtoken');
const Passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');
const dotenv = require('dotenv').config();

const { Users } = require("../../config/initializers/database");
const CryptService = require("./crypt");
const UserService = require("./common");

const passportAuth = Passport.authenticate('jwt', { session: false });


/*
    JWT methods
*/
function Sign(data, secret, useNewToken = false) {
    const token = useNewToken
      ? jwt.sign(
        {
          email: data.email
        },
        secret,
        { expiresIn: '14d' })
      : jwt.sign(
        {
          email: data.email
        }, secret);
  
    return token;
}
  
// eslint-disable-next-line no-unused-vars
function Verify(token, secret) {
    throw Error('Not implemented yet');
}


const LoginFailed = (user, loginFailed) => new Promise((resolve, reject) => {
  Users.update(
    {
      errorLoginCount: loginFailed
      ? Sequelize.literal('error_login_count + 1')
      : 0
    },
    { where: { email: user } }
  )
  .then((res) => resolve())
  .catch(reject);
});

module.exports = {
    passportAuth,
    Sign,
    Verify,
    LoginFailed
}