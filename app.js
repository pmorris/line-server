const express = require('express');
const fs      = require('fs');
const fileParser = require('./helpers/file_parser');
const config = require('./config/app.js');

const app = express();
const httpPort   = process.argv[3] || config.app.port;

// validate runtime configuration and start the server
// verify our filename has been provided
if (process.argv.length < 3) {
  throw new Error('A filename must be provided as an argument.');
}

const fileName = process.argv[2];

// open the requested file for reading
fs.access(fileName, fs.constants.R_OK, function (error) {
  if (error) {
    console.log(`The file is not availale for reading: ${fileName}`);
    throw error;
  }

  let myFile = new fileParser(fileName);
  const lineCount = myFile.getLineCount();

  // get the line count of the file
  console.log(`Successfully opened ${myFile.getFileName()} containing ${myFile.getLineCount().toLocaleString()} lines.`);

  function lineRequestHandler(req, res) {
    console.log (`Processing request for line: ${req.params.lineNum}`);

    myFile.getLine(Number(req.params.lineNum), function (line) {
      res.status(200).send(line);
    });
  }

  app.get('/lines/:lineNum', function (req, res) {
    // validateLineServerRequest(req, res, lineRequestHandler);

    // validate lineNum as an integer
    if (!req.params.lineNum.match('^[0-9]+$')) {
      res.status(404).send(`Invalid line requested: ${req.params.lineNum}`);
      return;
    }

    // verify the lineNum requested is within range
    if (Number(req.params.lineNum) > myFile.getLineCount()) {
      res.status(413).send(`Invalid line requested: ${req.params.lineNum}`);
      return;
    }

    lineRequestHandler(req, res);
  });


  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
      res.status(404).send('Not Found');
      next();
  });

  // start the HTTP server
  const hostName = '127.0.0.1';
  const backLog = 511;
  app.listen(httpPort, hostName, backLog, function (err) {
    if (err) {
      console.log(`Unable to start the server. ${err}`);
      return;
    }

    console.log(`HTTP server listening on ${hostName}:${httpPort}`);
  });

});

module.exports = app;
