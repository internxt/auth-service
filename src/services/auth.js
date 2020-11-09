const Sequelize = require('sequelize');
const jwt = require('jsonwebtoken');
const passport = require('passport');

const { Users } = require("../../config/initializers/database");
const CryptService = require("./crypt");

const passportAuth = passport.authenticate('jwt', { session: false });


function Sign(data, secret, useNewToken = false) {
    const token = useNewToken
      ? jwt.sign({ email: data }, secret, { expiresIn: '14d' })
      : jwt.sign(data, secret);
  
    return token;
}

  
  // eslint-disable-next-line no-unused-vars
function Verify(token, secret) {
    throw Error('Not implemented yet');
}


const LoginFailed = (user, loginFailed) => new Promise((resolve, reject) => {
    Model.users
      .update(
        {
          errorLoginCount: loginFailed
            ? sequelize.literal('error_login_count + 1')
            : 0
        },
        { where: { email: user } }
      )
      .then((res) => resolve())
      .catch(reject);
});

module.exports = {
    Sign,
    Verify,
    LoginFailed
}