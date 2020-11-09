const Sequelize = require('sequelize');
const { Op } = Sequelize;
const async = require('async');
const uuid = require('uuid');

const { Users } = require("../../config/initializers/database");



const RegisterNewUser = (user) => {
    // Check data
    if (!user.email || !user.password || !user.salt || !user.mnemonic) {
      throw new Error('Inssuficient registration data');
    }

    // Decrypt password
    //const userPass = App.services.Crypt.decryptText(user.password);
    //const userSalt = App.services.Crypt.decryptText(user.salt);

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
      ? App.services.Crypt.decryptText(user.password)
      : null;
    const userSalt = user.salt
      ? App.services.Crypt.decryptText(user.salt)
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
          const bcryptId = await App.services.Storj.IdToBcrypt(
            userResult.email
          );

          const bridgeUser = await App.services.Storj.RegisterBridgeUser(
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

          log.info(
            'User Service | created brigde user: %s with uuid: %s',
            userResult.email,
            userResult.uuid
          );

          const freeTier = bridgeUser.data ? bridgeUser.data.isFreeTier : 1;
          // Store bcryptid on user register
          await userResult.update(
            { userId: bcryptId, isFreeTier: freeTier },
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
          log.error(err.response.data);
        } else {
          log.error(err.stack);
        }

        throw new Error(err);
      })); // end transaction
};

const Register = (userData) => new Promise ((resolve, reject) => {
    
    console.log("USER: ", userData);
    User.create({
        uuid: userData.uuid,
        userId: userData.userId,
        name: userData.name,
        lastname: userData.lastname,
        email: userData.email,
        password: userData.password,
        mnemonic: userData.mnemonic,
        hKey: userData.hKey,
        secret_2FA: userData.secret_2FA,
        errorLoginCount: userData.errorLoginCount,
        referral: userData.referral
        
    }).then((user) => {
        console.log("NEW USER", user);
        resolve(user);
    }).catch((err) => {
        console.log("EN ERROR");
        reject(err);
    });
});


module.exports = {
    Register
}

