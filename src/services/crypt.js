const CryptoJS = require('crypto-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const AesUtil = require('../lib/AesUtil');;
const dotenv = require('dotenv').config();
const Log = require('../lib/logger');
const { lookup } = require('dns');
const Logger = Log();


function probabilisticEncryption(content) {
    try {
      const b64 = CryptoJS.AES.encrypt(
        content,
        dotenv.parsed.CRYPTO_SECRET2
      ).toString();
      const e64 = CryptoJS.enc.Base64.parse(b64);
      const eHex = e64.toString(CryptoJS.enc.Hex);

      return eHex;
    } catch (error) {
      Logger.error(`(probabilisticEncryption): ${error}`);

      return null;
    }
}

function probabilisticDecryption(cipherText) {
    try {
      const reb64 = CryptoJS.enc.Hex.parse(cipherText);
      const bytes = reb64.words.toString(CryptoJS.enc.Base64);
      const decrypt = CryptoJS.AES.decrypt(bytes, dotenv.parsed.CRYPTO_SECRET2);   
      const plain = decrypt.words.toString(CryptoJS.enc.Utf8);
      
      return plain;
    } catch (error) {
      Logger.error(`(probabilisticDecryption): ${error}`);

      return null;
    }
}

function deterministicEncryption(content, salt) {
    try {
      
      const key = CryptoJS.enc.Hex.parse(
        dotenv.parsed.CRYPTO_SECRET2
      );
      
      const iv = salt ? CryptoJS.enc.Hex.parse(salt.toString()) : key;

      const encrypt = CryptoJS.AES.encrypt(content, key, { iv }).toString();
      const b64 = CryptoJS.enc.Base64.parse(encrypt);
      const eHex = b64.toString(CryptoJS.enc.Hex);

      

      return eHex;
    } catch (e) {
      return null;
    }
}

function deterministicDecryption(cipherText, salt) {
    try {
      const key = CryptoJS.enc.Hex.parse(
        dotenv.parsed.CRYPTO_SECRET2
      );
      const iv = salt ? CryptoJS.enc.Hex.parse(salt.toString()) : key;

      const reb64 = CryptoJS.enc.Hex.parse(cipherText);
      const bytes = reb64.toString(CryptoJS.enc.Base64);
      const decrypt = CryptoJS.AES.decrypt(bytes, key, { iv });
      const plain = decrypt.toString(CryptoJS.enc.Utf8);

      return plain;
    } catch (e) {
      return null;
    }
}

function encryptName(name, salt) {
    if (salt) {
      const encryptedResult = AesUtil.encrypt(name, salt, !salt);

      return encryptedResult;
    }

    return probabilisticEncryption(name);
}

function decryptName(cipherText, salt) {
    if (salt) {
      try {
        const result = AesUtil.decrypt(cipherText, salt);

        return result;
      } catch (e) {
        console.log('ERROR', e.message);
      }
    }
    

    if (!salt) {
      console.log(cipherText);
      // If no salt, something is trying to use legacy decryption
      return probabilisticDecryption(cipherText);
    }
    // If salt is provided, we could have 2 scenarios

    // 1. The cipherText is truly encripted with salt in a deterministic way
    const decrypted = deterministicDecryption(cipherText, salt);

    if (!decrypted) {
      // 2. The deterministic algorithm failed although salt were provided.
      // So, the cipherText is encrypted in a probabilistic way.

      return probabilisticDecryption(cipherText);
    }

    return decrypted;
}

// AES Plain text decryption method
function decryptText(encryptedText, salt) {
    return decryptName(encryptedText, salt);
}

// AES Plain text encryption method
function encryptText(textToEncrypt, salt) {
    return encryptName(textToEncrypt, salt);
}

// Method to hash password. If salt is passed, use it, in other case use crypto lib for generate salt
function passToHash(passObject) {
    try {
      const salt = passObject.salt
        ? CryptoJS.enc.Hex.parse(passObject.salt.toString())
        : CryptoJS.lib.WordArray.random(128 / 8);
      const hash = CryptoJS.PBKDF2(passObject.password, salt, {
        keySize: 256 / 32,
        iterations: 10000
      });
      const hashedObjetc = {
        salt: salt.toString(),
        hash: hash.toString()
      };

      return hashedObjetc;
    } catch (error) {
      throw new Error(error);
    }
}

function hashSha256(text) {
    return CryptoJS.SHA256(text).toString();
}

function pwdToHex(pwd) {
  try {
    return crypto.createHash('sha256').update(pwd).digest('hex');
  } catch (error) {
    Logger.error('[CRYPTO sha256] ', error);

    return null;
  }
}

function IdToBcrypt(id) {
  try {
    return bcrypt.hashSync(id.toString(), 8);
  } catch (error) {
    console.log('[BCRYPTJS]', error);

    return null;
  }
}


module.exports = {
    decryptName,
    encryptName,
    decryptText,
    encryptText,
    deterministicEncryption,
    deterministicDecryption,
    probabilisticEncryption,
    probabilisticDecryption,
    passToHash,
    hashSha256,
    pwdToHex,
    IdToBcrypt
}