const useragent = require('useragent');
const uuid = require('uuid');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const AuthService = require('./services/auth');
const RegisterService = require('./services/new');
const UserService = require('./services/common');
const CryptService = require('./services/crypt');
const BridgeService = require('./services/bridge');
const { passportAuth } = require('./services/auth');
const Log = require('./lib/logger');


/*
    Starts auth server
*/
const Server = require('../config/initializers/server');
const Logger = Log();


/*
    ENDPOINTS
*/

/**
   * @swagger
   * /register:
   *   post:
   *     description: User registration. User is registered or created.
   *     produces:
   *       - application/json
   *     parameters:
   *       - description: user object with all registration info
   *         in: body
   *         required: true
   *     responses:
   *       200:
   *         description: Successfull user registration
   *       204:
   *         description: User with this email exists
*/
Server.post('/register', async (req, res) => {
  console.log(req.body)
  // Data validation for process only request with all data
  if (req.body.email && req.body.password) {
    req.body.email = req.body.email.toLowerCase().trim();
    Logger.warn(
      'Register request for %s from %s',
      req.body.email,
      req.headers['X-Forwarded-For']
    );

    const newUser = req.body;
    newUser.credit = 0;
    const { referral } = req.body;

    if (uuid.validate(referral)) {
      await UserService.FindUserByUuid(referral).then((userData) => {
        if (userData === null) {
          // Don't exists referral user
          console.log("Referrral UUID doesn't exists");
        } else {
          newUser.credit = 5;
          UserService.UpdateCredit(referral);
        }
      }).catch((err) => console.log(err));
    }
    //const { privateKey, publicKey, revocationKey } = req.body

    /*
    console.log('CLAVE PRIVADA SERVER', privateKey.length)
    console.log('******************************************************************************')
    console.log('CLAVE PUBLICA SERVER', publicKey.length)
    console.log('******************************************************************************')
    console.log('CLAVE REVOCATE SERVER', revocationKey.length)*/

    // Call user service to find or create user
    RegisterService.FindOrCreate(newUser)
      .then((userData) => {
        // Process user data and answer API call
        if (userData.isCreated) {
          const agent = useragent.parse(req.headers['user-agent']);
          const client = useragent.parse(req.headers['internxt-client']);
          if (client && client.source === '') {
            client.source = 'x-cloud-mobile';
          }
          
          // Successfull register
          const token = AuthService.Sign(
            userData,
            process.env.JWT_SECRET
          );
          const user = { email: userData.email };
          res.status(200).send({ token, user });
        } else {
          // This account already exists
          res.status(400).send({ message: 'This account already exists' });
        }
      }).catch((err) => {
        Logger.error(`${err.message}\n${err.stack}`);
        res.status(500).send({ message: err.message });
      });
  } else {
    res.status(400).send({ message: 'You must provide registration data' });
  }
});


/**
   * @swagger
   * /login:
   *   post:
   *     description: User login. Check if user exists.
   *     produces:
   *       - application/json
   *     parameters:
   *       - description: user object with email
   *         in: body
   *         required: true
   *     responses:
   *       200:
   *         description: Email exists
   *       204:
   *         description: Wrong username or password
*/

Server.post('/login', (req, res) => {
  req.body.email = req.body.email.toLowerCase();
  if (!req.body.email) {
    return res.status(400).send({ error: 'No email address specified' });
  }

  // Call user service to find user
  return UserService.FindUserByEmail(req.body.email).then((userData) => {
    if (!userData) {
      // Wrong user
      return res.status(400).json({ error: 'Wrong email/password' });
    }

    return BridgeService.IsUserActivated(req.body.email).then((resActivation) => {
      if (!resActivation.data.activated) {
        res.status(400).send({ error: 'User is not activated' });
      } else {
        const encSalt = CryptService.encryptText(
          userData.hKey.toString()
        );
        
        const required2FA = userData.secret_2FA && userData.secret_2FA.length > 0;
        res.status(200).send({ sKey: encSalt, tfa: required2FA });
      }
    }).catch((err) => {
      Logger.error(err);
      res.status(400).send({
        error: 'User not found on Bridge database',
        message: err.response ? err.response.data : err,
      });
    });
  }).catch((err) => {
    Logger.error(`${err}: ${req.body.email}`);
    res.status(400).send({
      error: 'User not found on Cloud database',
      message: err.message,
    });
  });
});

/**
   * @swagger
   * /access:
   *   post:
   *     description: User login second part. Check if password is correct.
   *     produces:
   *       - application/json
   *     parameters:
   *       - description: user object with email and password
   *         in: body
   *         required: true
   *     responses:
   *       200:
   *         description: Successfull login
   *       204:
   *         description: Wrong username or password
*/
Server.post('/access', (req, res) => {
  /*const MAX_LOGIN_FAIL_ATTEMPTS = 3;

  let isTeamActivated = false;
  let rootFolderId = 0;
  let userTeam = null;

  // Call user service to find or create user
  UserService.FindUserByEmail(req.body.email).then(async (userData) => {
    if (userData.errorLoginCount >= MAX_LOGIN_FAIL_ATTEMPTS) {
      res.status(500).send({
        error:
          'Your account has been blocked for security reasons. Please reach out to us'
      })
      return;
    }
    /*
    Service.Keyserver.keysExists(userData).then(async () => {
      console.log('ID DEL KEYEXISTS USUARIO', userData.id)

    }).catch((err) => {
      Service.Keyserver.addKeysLogin(userData, req.body.publicKey, req.body.privateKey, req.body.revocationKey).then(async (keys) => {

        console.log(err)
      }).catch((err) => {
        console.log('No se han podido guardar las claves')
        console.log(err)
      });
    });


    let responseTeam = null;
    // Check if user has a team
    await new Promise((resolve, reject) => {
      Service.Team.getTeamByMember(req.body.email).then(async (team) => {
        console.log("USERTEAM: ", team); //debug
        userTeam = team;
        if (team !== undefined) {
          rootFolderId = (await Service.User.FindUserByEmail(team.bridge_user)).root_folder_id;
          responseTeam = await Service.Storj.IsUserActivated(team.bridge_user);
          //console.log("RESPONSE TEAM ", responseTeam); //debug
          if (responseTeam) {
            console.log('RESPONSE TEAM', responseTeam)
            console.log("IS TEAM ACTIVATED: ", responseTeam.data.activated); //debug
            isTeamActivated = responseTeam.data.activated;
            userTeam = {
              bridge_user: userTeam.bridge_user,
              bridge_password: userTeam.bridge_password,
              bridge_mnemonic: userTeam.bridge_mnemonic,
              admin: userTeam.admin,
              root_folder_id: rootFolderId,
              isActivated: isTeamActivated
            };
            resolve();
          }
        }
        resolve();
      }).catch((error) => {
        Logger.error(error.stack);
        reject()
      });
    })

    // Process user data and answer API call
    const pass = App.services.Crypt.decryptText(req.body.password);

    // 2-Factor Auth. Verification
    const needsTfa = userData.secret_2FA && userData.secret_2FA.length > 0;
    let tfaResult = true;

    if (needsTfa) {
      tfaResult = speakeasy.totp.verifyDelta({
        secret: userData.secret_2FA,
        token: req.body.tfa,
        encoding: 'base32',
        window: 2
      });
    }

    if (!tfaResult) {
      res.status(400).send({ error: 'Wrong 2-factor auth code' });
    } else if (pass === userData.password.toString() && tfaResult) {
      // Successfull login
      const internxtClient = req.headers['internxt-client'];
      const token = passport.Sign(
        userData.email,
        App.config.get('secrets').JWT,
        internxtClient === 'x-cloud-web' || internxtClient === 'drive-web'
      );

      Service.User.LoginFailed(req.body.email, false);
      Service.User.UpdateAccountActivity(req.body.email);

      res.status(200).json({
        user: {
          userId: userData.userId,
          mnemonic: userData.mnemonic,
          root_folder_id: userData.root_folder_id,
          storeMnemonic: userData.storeMnemonic,
          name: userData.name,
          lastname: userData.lastname,
          uuid: userData.uuid,
          credit: userData.credit
        },
        token,
        userTeam
      });
    } else {
      // Wrong password
      if (pass !== userData.password.toString()) {
        Service.User.LoginFailed(req.body.email, true);
      }

      res.status(400).json({ error: 'Wrong email/password' });
    }

  }).catch((err) => {
    Logger.error(`${err.message}\n${err.stack}`);
    res.status(400).send({
      error: 'User not found on Cloud database',
      message: err.message
    });
  });*/
});


/**
 * 
 * Gets a new 2FA code
 * Only auth. users can generate a new code.
 * Prevent 2FA users from getting a new code.
*/
Server.get('/tfa', passportAuth, (req, res) => {
  const userData = req.user;
  if (!userData) {
    res.status(500).send({ error: 'User does not exists' });
  } else if (userData.secret_2FA) {
    res.status(500).send({ error: 'User has already 2FA' });
  } else {
    const secret = speakeasy.generateSecret({ length: 10 });
    const url = speakeasy.otpauthURL({
      secret: secret.ascii,
      label: 'Internxt'
    });
    qrcode
      .toDataURL(url)
      .then((bidi) => {
        res.status(200).send({
          code: secret.base32,
          qr: bidi
        });
      })
      .catch((err) => {
        Logger.error(err);
        res.status(500).send({ error: 'Server error' });
      });
  }
});

Server.put('/tfa', passportAuth, (req, res) => {
  const user = req.user.email;

  UserService.FindUserByEmail(user).then((userData) => {
    if (userData.secret_2FA) {
      res.status(500).send({ error: 'User already has 2FA' });
    } else {
      // Check 2FA
      const isValid = speakeasy.totp.verifyDelta({
        secret: req.body.key,
        token: req.body.code,
        encoding: 'base32',
        window: 2
      });

      if (isValid) {
        UserService.Store2FA(user, req.body.key)
          .then((result) => {
            res.status(200).send({ message: 'ok' });
          })
          .catch((err) => {
            res.status(500).send({ error: 'Error storing configuration' });
          });
      } else {
        res.status(500).send({ error: 'Code is not valid' });
      }
    }
  })
    .catch((err) => {
      res.status(500).send({ error: 'Internal server error' });
    });
});

Server.delete('/tfa', passportAuth, (req, res) => {
  const user = req.user.email;

  UserService.FindUserByEmail(user).then((userData) => {
    if (!userData.secret_2FA) {
      res
        .status(500)
        .send({ error: 'Your account does not have 2FA activated.' });
    } else {
      // Check 2FA confirmation is valid
      const isValid = speakeasy.totp.verifyDelta({
        secret: userData.secret_2FA,
        token: req.body.code,
        encoding: 'base32',
        window: 2
      });

      // Check user password is valid
      const decryptedPass = CryptService.decryptText(req.body.pass);

      if (userData.password.toString() !== decryptedPass) {
        res.status(500).send({ error: 'Invalid password' });
      } else if (!isValid) {
        res.status(500).send({
          error: 'Invalid 2FA code. Please, use an updated code.'
        });
      } else {
        UserService.Delete2FA(user)
          .then((result) => {
            res.status(200).send({ message: 'ok' });
          })
          .catch((err) => {
            res.status(500).send({
              error: 'Server error deactivating user 2FA. Try again later.'
            });
          });
      }
    }
  })
    .catch((err) => {
      res.status(500).send();
    });
});


Server.put('/mnemonic', passportAuth, (req, res) => {
  const {
    body: { email, mnemonic }
  } = req;
  UserService.UpdateMnemonic(email, mnemonic).then(() => {
    res.status(200).json({
      message: 'Successfully updated user with mnemonic'
    });
  }).catch(({ message }) => {
    Logger.error(message);
    res.status(400).json({ message, code: 400 });
  });
});


Server.patch('/password', passportAuth, (req, res) => {
  const user = req.user.email;

  const currentPassword = CryptService.decryptText(
    req.body.currentPassword
  );
  const newPassword = CryptService.decryptText(req.body.newPassword);
  const newSalt = CryptService.decryptText(req.body.newSalt);
  const { mnemonic } = req.body;

  UserService.UpdatePasswordMnemonic(
    user,
    currentPassword,
    newPassword,
    newSalt,
    mnemonic
  ).then((result) => {
    res.status(200).send({});
  }).catch((err) => {
    console.log(err);
    res.status(500).send(err);
  });
});


/*Server.get('/user/keys', passportAuth, (req, res) => {
    const { user } = req.user
    //Generate keys
    openpgp.generateKey({
      userIds: [{ email: 'inxt@inxt.com' }], // you can pass multiple user IDs
      curve: 'ed25519',                                           // ECC curve name
    });
    const codpublicKey = Buffer.from(publicKeyArmored).toString('base64');

    Service.Keyserver.keysExists(user).then((userKey) => {
      res.status(200).send({
        publicKey: userKey.publicKey

      }).catch((message) => {
        //Logger.error(message);
        res.status(200).send({
          publicKey: codpublicKey
        });
      });
    });
});*/


Server.get('/deactivate', passportAuth, (req, res) => {
  const user = req.user.email;

  UserService.DeactivateUser(user)
    .then((bridgeRes) => {
      res.status(200).send({ error: null, message: 'User deactivated' });
    })
    .catch((err) => {
      res.status(500).send({ error: err.message });
    });
});

Server.get('/reset/:email', (req, res) => {
  const user = req.params.email.toLowerCase();
  UserService.DeactivateUser(user)
    .then(() => {
      res.status(200).send();
    })
    .catch(() => {
      res.status(200).send();
    });
});

Server.get('/confirmDeactivation/:token', (req, res) => {
  const { token } = req.params;

  UserService.ConfirmDeactivateUser(token)
    .then((resConfirm) => {
      res.status(resConfirm.status).send(req.data);
    })
    .catch((err) => {
      console.log('Deactivation request to Server failed');
      console.log(err);
      res.status(400).send({ error: err.message });
    });
});


Server.get('/resend/:email', (req, res) => {
  UserService.ResendActivationEmail(req.params.email)
    .then(() => {
      res.status(200).send({ message: 'ok' });
    })
    .catch((err) => {
      res.status(500).send({
        error:
          err.response.data && err.response.data.error
            ? err.response.data.error
            : 'Internal server error'
      });
    });
});

