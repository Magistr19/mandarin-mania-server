'use strict';

let http = require('http');
let server = new http.Server();
let fs = require('fs');

server.on('request', (req, res) => {
  console.log('asdd')
});

const PORT = 8087

server.listen(PORT);

