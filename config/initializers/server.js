const express = require('express')
const json = require('body-parser');

const Server = express();
Server.use(json.json());


Server.listen(8000);
console.log("Server started at port 8000")

module.exports = Server