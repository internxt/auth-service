const Sequelize = require('sequelize');
const { Op } = Sequelize;
const crypto = require('crypto-js');

const { Users } = require("../../config/initializers/database");
const CryptService = require("./crypt");
const Log = require('../lib/logger');
const Logger = Log();



const FindUserByUuid = (uuid) => Model.users.findOne({ where: { uuid: { [Op.eq]: uuid } } });


const FindUserByEmail = (email) => {
    return new Promise((resolve, reject) => {
        Users.findOne({ where: { email: { [Op.eq]: email } }}).then((userData) => {
          if (userData) {
            const user = userData.dataValues;
            if (user.mnemonic) user.mnemonic = user.mnemonic.toString();

            resolve(user);
          } else {
            reject('User not found on Auth database');
          }
        })
        .catch((err) => reject(err));
    });
};

const FindUserObjByEmail = (email) => {
    return Model.users.findOne({ where: { email: { [Op.eq]: email } } });
}


const UpdateMnemonic = async (userEmail, mnemonic) => {
    const found = FindUserByEmail(userEmail);
    if (found) {
      try {
        const user = await Users.update(
          { mnemonic },
          { where: { email: { [Op.eq]: userEmail } }, validate: true }
        );

        return user;
      } catch (errorResponse) {
        throw new Error(errorResponse);
      }
    } else {
      return null;
    }
};


const Store2FA = (userEmail, key) => new Promise((resolve, reject) => {
    Users
      .update({ secret_2FA: key }, { where: { email: { [Op.eq]: userEmail } } })
      .then(resolve)
      .catch(reject);
});


const Delete2FA = (userEmail) => new Promise((resolve, reject) => {
    Users
      .update({ secret_2FA: null }, { where: { email: { [Op.eq]: userEmail } } })
      .then(resolve)
      .catch(reject);
});


const ResetPassword = (email) =>
// TODO: Reset password should check ShouldSendEmail
    new Promise((resolve, reject) => {
    Users
        .findOne({ where: { email: { [Op.eq]: email } } })
        .then((user) => {
        
            const password = crypto.SHA256(user.userId).toString();
            const auth = Buffer.from(`${user.email}:${password}`).toString(
                'base64'
            );

            axios
                .patch(`${App.config.get('STORJ_BRIDGE')}/users/${email}`, {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
        })
        .then(resolve)
        .catch((err) => {
          Logger.error(err.response.data);
          reject(err);
        });
    })
    .catch(reject);
});

const ConfirmResetPassword = (email, token, newPassword) => new Promise((resolve, reject) => {
    axios
        .post(`${App.config.get('STORJ_BRIDGE')}/resets/${token}`, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
    })
    .then(resolve)
    .catch(reject);
});


const UpdatePasswordMnemonic = (
    userEmail,
    currentPassword,
    newPassword,
    newSalt,
    mnemonic
  ) => new Promise((resolve, reject) => {
    FindUserByEmail(userEmail)
      .then((userData) => {
        console.log('Found on database');

        const storedPassword = userData.password.toString();

        if (storedPassword !== currentPassword) {
          console.log('Invalid password');
          reject({ error: 'Invalid password' });
        } else {
          console.log('Valid password');

          resolve();

          Users
            .update(
              {
                password: newPassword,
                mnemonic,
                hKey: newSalt
              },
              { where: { email: { [Op.eq]: userEmail } } }
            )
            .then((res) => {
              console.log('Updated', res);
              resolve();
            })
            .catch((err) => {
              Logger.error('error updating', err);
              reject({ error: 'Error updating info' });
            });
        }
      })
      .catch((err) => {
        console.error(err);
        reject({ error: 'Internal server error' });
      });
  });


  


module.exports = {
    FindUserByUuid,
    FindUserByEmail,
    FindUserObjByEmail,
    UpdateMnemonic,
    Store2FA,
    Delete2FA,
    ResetPassword,
    ConfirmResetPassword,
    UpdatePasswordMnemonic
}