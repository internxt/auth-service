const nconf = require('nconf');
require('dotenv').config();


const Config = function () {
  if (!(this instanceof Config)) {
    return new Config();
  }

  // Load environment variables in order below
  //   1. Command-line arguments
  //   2. Environment variables
  //   3. A file located at 'path/to/config.json'
  // Throw if required config is missing
  // eslint-disable-next-line global-require
  nconf.argv();
  nconf.env();
  nconf.required(['NODE_ENV']);
  nconf.use('conf', {
    type: 'literal',
    // eslint-disable-next-line global-require
    store: require(`../environments/${process.env.NODE_ENV}.js`).data,
  });
  nconf.required(['server:port']);

  this.nconf = nconf;

  return this;
};


Config.prototype.get = function (key) {
  // return this._nconf.get(key)
  return this.nconf.get(key);
};

module.exports = Config;