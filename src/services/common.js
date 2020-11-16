const Sequelize = require('sequelize');
const { Op } = Sequelize;
const crypto = require('crypto-js');
const axios = require('axios');
const dotenv = require('dotenv').config();
const STORJ_BRIDGE = dotenv.parsed.STORJ_BRIDGE;

const { Users } = require("../../config/initializers/database");
const Log = require('../lib/logger');
const Logger = Log();



const FindUserByUuid = (uuid) => Model.users.findOne({ where: { uuid: { [Op.eq]: uuid } } });


const FindUserByEmail = (email) => {
  return new Promise((resolve, reject) => {
    Users.findOne({ where: { email: { [Op.eq]: email } } }).then((userData) => {
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
          .patch(`${STORJ_BRIDGE}/users/${email}`, {
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
    .post(`${STORJ_BRIDGE}/resets/${token}`, {
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
  FindUserByEmail(userEmail).then((userData) => {
      const storedPassword = userData.password.toString();

      if (storedPassword !== currentPassword) {
        console.log('Invalid password');
        reject({ error: 'Invalid password' });
      } else {
        console.log('Valid password');

        resolve();

        Users.update(
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


const UpdateAccountActivity = (user) => new Promise((resolve, reject) => {
  Users
    .update({ updated_at: new Date() }, { where: { email: user } })
    .then((res) => {
      resolve();
    })
    .catch(reject);
});

const ActivateUser = (token) => {
  return axios.get(`${App.config.get('STORJ_BRIDGE')}/activations/${token}`)
}

const DeactivateUser = (email) => new Promise(async (resolve, reject) => {
  const shouldSend = await ShouldSendEmail(email);

  if (!shouldSend) {
    Logger.info('Do not resend deactivation email to %s', email);

    return resolve(); // noop
  }

  SetEmailSended(email);

  Users.findOne({ where: { email: { [Op.eq]: email } } })
    .then((user) => {
      const password = crypto.SHA256(user.userId).toString();
      const auth = Buffer.from(`${user.email}:${password}`).toString(
        'base64'
      );

      axios
        .delete(`${STORJ_BRIDGE}/users/${email}`, {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        })
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
          Logger.warn(err.response.data);
          reject(err);
        });
    })
    .catch(reject);
});

const ConfirmDeactivateUser = (token) => new Promise((resolve, reject) => {
  async.waterfall(
    [
      (next) => {
        axios
          .get(
            `${STORJ_BRIDGE}/deactivationStripe/${token}`,
            {
              headers: { 'Content-Type': 'application/json' }
            }
          )
          .then((res) => {
            console.log('User deleted from bridge');
            next(null, res);
          })
          .catch((err) => {
            console.log('Error user deleted from bridge');
            next(err);
          });
      },
      (data, next) => {
        const userEmail = data.data.email;
        Users.findOne({ where: { email: { [Op.eq]: userEmail } } })
          .then((user) => {
            const referralUuid = user.referral;
            if (uuid.validate(referralUuid)) {
              DecrementCredit(referralUuid);
              Logger.info('Referral credit decremented for user: %s', referralUuid);
            }

            user.destroy()
              .then((result) => {
                Logger.info('User deleted on sql', userEmail);
                next(null, data);
              })
              .catch((err) => {
                console.log('Error deleting user on sql');
                next(err);
              });
          })
          .catch(next);
      }
    ],
    (err, result) => {
      if (err) {
        console.log('Error waterfall', err);
        reject(err);
      } else {
        resolve(result);
      }
    }
  );
});

const ResendActivationEmail = async (user) => {
  const shouldSend = await ShouldSendEmail(user);
  if (shouldSend) {
    return resolve(); // noop
  }

  SetEmailSended(user);

  return axios.post(`${process.env.STORJ_BRIDGE}/activations`, { email: user })
  
};

const ShouldSendEmail = (email) => new Promise((resolve, reject) => {
  Users.findOne({ where: { email: { [Op.eq]: email } } })
    .then((user) => {
      if (!user.lastResend) {
        return resolve(true); // Field is null, send email
      }

      const dateDiff = new Date() - user.lastResend;
      resolve(dateDiff > LAST_MAIL_RESEND_INTERVAL);
    })
    .catch(reject);
});

const SetEmailSended = (email) => Users.update(
  {
    lastResend: new Date()
  },
  { where: { email: { [Op.eq]: email } } }
);

const UpdateCredit = async (userUuid) => await Model.users.update(
  { credit: Sequelize.literal('credit + 5') },
  { where: { uuid: { [Op.eq]: userUuid } } }
);

const DecrementCredit = async (userUuid) => await Model.users.update(
  { credit: Sequelize.literal('credit - 5') },
  { where: { uuid: { [Op.eq]: userUuid } } }
);


module.exports = {
  FindUserByUuid,
  FindUserByEmail,
  FindUserObjByEmail,
  UpdateMnemonic,
  Store2FA,
  Delete2FA,
  ResetPassword,
  ConfirmResetPassword,
  UpdatePasswordMnemonic,
  UpdateAccountActivity,
  ActivateUser,
  DeactivateUser,
  ConfirmDeactivateUser,
  ResendActivationEmail,
  UpdateCredit,
  DecrementCredit
}