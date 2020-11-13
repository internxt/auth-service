const express = require('express');
const dotenv = require('dotenv').config();
const json = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');

const UserService = require("../../src/services/common");
const Log = require('../../src/lib/logger');
const Logger = Log();

const Server = express();

/*
    Middlewares
*/
Server.use(json.json());

// enables cors
Server.use(
    cors({
      allowedHeaders: ['sessionId', 'Content-Type', 'Authorization', 'method', 'internxt-version', 'internxt-client', 'internxt-mnemonic'],
      exposedHeaders: ['sessionId'],
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      preflightContinue: false,
    }),
);

/**
   * Logger middleware.
   * Prints in console the used endpoints in real time.
*/
Server.use(function (req, res, next) {
    let user = null;
    if (req.headers.authorization) {
      try {
        const x = jwt.decode(req.headers.authorization.split(" ")[1])
        if (x.email) {
          user = x.email
        } else {
          user = x
        }
      } catch (e) {

      }
    }
    Logger.info(
      `[${req.method}${req.headers.authorization ? ' w/AUTH' : ''}] ${req.originalUrl} ${user ? '\t' + user : ''}`,
    );
    next();
});

/**
   * JWT configuration.
   * Defines user authorization source (header / bearer token),
   * and the password to verify the JWT
   */
const passportOpts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: dotenv.parsed.JWT_SECRET
};

/**
* Passport strategy configuration.
* Once JWT is granted, this middleware resolves the user info
*/
Passport.use(
    new JwtStrategy(passportOpts, (payload, done) => {
    /* Temporal compatibility with old JWT
    * BEGIN
    */
    const COMPATIBILITY = true;
    let email = payload;
    if (typeof payload === 'object') {
        email = payload.email;
    } else if (!COMPATIBILITY) {
        return done(new Error('Old JWT not supported'));
    }
    /* END
    * After JWT migration, the email will be payload.email
    * and delete this block + uncomment next line
    */

    // const email = payload.email

    UserService.FindUserObjByEmail(email).then((user) => 
        done(null, user)).catch((err) => {
          console.log('Unauthorized %s', email)
          done(err)
        });
    }),
);


Server.listen(8000);
Logger.info("Auth server started");

module.exports = Server