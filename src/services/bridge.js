const axios = require('axios');
const CryptService = require('./crypt');
const dotenv = require('dotenv').config();
const STORJ_BRIDGE = dotenv.parsed.STORJ_BRIDGE;

const RegisterBridgeUser = (email, password) => {
    // Set variables
    const hashPwd = CryptService.pwdToHex(password);
  
    // Set api call settings
    const params = { headers: { 'Content-Type': 'application/json' } };
    const data = {
      email,
      password: hashPwd
    };
  
    // Do api call
    return axios
      .post(`${STORJ_BRIDGE}/users`, data, params)
      .then((response) => response)
      .catch((error) => error);
};

const IsUserActivated = (email) => {
    // Set api call settings
    const params = { headers: { 'Content-Type': 'application/json', email } };

    // Do api call
    return axios.get(
      `${STORJ_BRIDGE}/users/isactivated`,
      params
    );
  };


module.exports = {
    IsUserActivated,
    RegisterBridgeUser
}