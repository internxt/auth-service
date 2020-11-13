const Sequelize = require('sequelize');
const { Op } = Sequelize;
const uuid = require('uuid');
const dotenv = require('dotenv').config();
const STORJ_BRIDGE = dotenv.parsed.STORJ_BRIDGE;

const { Users } = require('../../config/initializers/database');
const CryptService = require('./crypt');
const BridgeService = require('./bridge')
const Log = require('../lib/logger');
const Logger = Log();


const RegisterNewUser = (user) => {
    // Check data
    if (!user.email || !user.password || !user.salt || !user.mnemonic) {
      throw new Error('Inssuficient registration data');
    }

    // Decrypt password
    const userPass = CryptService.decryptText(user.password);
    const userSalt = CryptService.decryptText(user.salt);

    const t = Model.users.sequelize.transaction();

    try {
      Users
        .findOne({ where: { email: { [Op.eq]: user.email } } })
        .then((result) => {
          console.log('Result', result);
        })
        .catch((err) => {
          console.log('Error', err);
        });
    } catch (e) {
      log.error(e);
    }
};


const FindOrCreate = (user) => {
    // Create password hashed pass only when a pass is given
    const userPass = user.password
      ? CryptService.decryptText(user.password)
      : null;
    const userSalt = user.salt
      ? CryptService.decryptText(user.salt)
      : null;

    // Throw error when user email. pass, salt or mnemonic is missing
    if (!user.email || !userPass || !userSalt || !user.mnemonic) {
      throw new Error('Wrong user registration data');
    }

    return Users.sequelize.transaction(async (t) => Users
      .findOrCreate({
        where: { email: user.email },
        defaults: {
          uuid: uuid.v4(),
          name: user.name,
          lastname: user.lastname,
          email: user.email,
          password: userPass,
          mnemonic: user.mnemonic,
          hKey: userSalt,
          secret_2FA: user.secret_2FA,
          errorLoginCount: user.errorLoginCount,
          referral: user.referral
        },
        transaction: t
      })
      .spread(async (userResult, created) => {
        if (created) {
          // Create bridge pass using email (because id is unconsistent)
          const bcryptId = await CryptService.IdToBcrypt(
            userResult.email
          );

          const bridgeUser = await BridgeService.RegisterBridgeUser(
            userResult.email,
            bcryptId
          );

          if (
            bridgeUser
              && bridgeUser.response
              && bridgeUser.response.status === 500
          ) {
            throw Error(bridgeUser.response.data.error);
          }

          if (!bridgeUser.data) {
            throw new Error('Error creating bridge user');
          }
          
          Logger.info(
            'User Service | created brigde user: %s with uuid: %s',
            userResult.email,
            userResult.uuid
          );
          //const freeTier = bridgeUser.data ? bridgeUser.data.isFreeTier : 1;
            
          // Store bcryptid on user register
          await userResult.update(
            { userId: bcryptId, isFreeTier: 1 },
            { transaction: t }
          );

          // Set created flag for Frontend management
          Object.assign(userResult, { isCreated: created });
        }

        // TODO: proveriti userId kao pass
        return userResult;
      })
      .catch((err) => {
        if (err.response) {
          // This happens when email is registered in bridge
          Logger.error(err.response.data);
        } else {
          Logger.error(err.stack);
        }

        throw new Error(err);
      })); // end transaction
};


module.exports = {
    RegisterNewUser,
    FindOrCreate
}

