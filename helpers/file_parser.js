const fs = require('fs');
const readline = require('readline');
const NodeCache = require('node-cache');
const child_process = require('child_process');
const config = require('../config/app.js').lineServer;

module.exports = class FileParser {

    constructor(fileName) {

        // load the file on instantiation
        this.fileName = fileName;
        this.fileSize = 0;
        this.lineCount = 0;
        this.index = { 1: 0 };
        this.indexLineInterval = config.indexLineInterval || 10000;
        this.cache = new NodeCache({
          stdTTL: config.cache.nodeCache.ttl || 100,
          checkperiod: config.cache.nodeCache.checkPeriod || 120,
        });

        this.indexFile();
    }

    /**
     * Get the name (or path) of the file
     *
     * @return {String} The file name
     */
    getFileName() {
        return this.fileName;
    }

    /**
     * Get the number of lines in the file
     *
     * @return {Number} - The number of lines in the file
     */
    getLineCount() {
        if (this.lineCount) {
            return this.lineCount;
        }

        try {
            // use shell commands to prevent loading the entire file into buffer
            // TODO: refactor this to not rely on unix commands
            var stdout = String(child_process.execFileSync('wc', ['-l', this.fileName]));
        } catch(err) {
            // error encountered
            var error = new Error(`Unable to determine the line count of ${this.fileName}`);
            throw error;
            return;
        }

        var pattern = '^[^0-9]*([0-9]+)';
        var res = stdout.match(pattern);

        if (!res) {
          error = new Error(`Unable to determine the line count of ${this.fileName}`);
          return;
        }

        this.lineCount = Number(res[1]);
        return this.lineCount;
    }

    /**
     * Creeate an index for the file to reduce scan times
     *
     * @param {Function} callback - The function to execute upon successful completion
     * @return {Object} This FileParser object, for method chaining
    */
    indexFile(callback) {

        const indexLineInterval = this.indexLineInterval;

        let lineNum = 0;
        let index = this.index;
        let indexCount = 0;

        console.log(`Indexing file at every ${indexLineInterval} lines.`);

        const lineCount = this.getLineCount();

        // read file 1 KB at a time
        const rl = readline.createInterface({
          input: fs.createReadStream(this.getFileName(), {
            flags: 'r',
            encoding: 'ASCII',
            highWaterMark: 1024,
          })
        });

        rl.on('line', function (line) {
          lineNum++;
          if (lineNum == 1) { console.log(`indexLineInterval: ${indexLineInterval}`); }
          if (lineNum % indexLineInterval == 0) {
            index[lineNum] = rl.input.bytesRead;
            indexCount++;
            console.log(`Indexing line ${lineNum}, bytesRead: ${rl.input.bytesRead} (${((lineNum / lineCount) * 100).toFixed(2)}%)`);
          }
        });
        rl.on('close', function () {
          console.log(`File indexing complete.
            ${rl.input.bytesRead} bytes read
            ${lineNum} lines indexed
            ${indexCount} datapoints within the index`);
          this.index = index;
          this.lineCount = lineNum;
          this.fileSize = rl.input.bytesRead;
          // TODO: write this index to Memchached with the file modification time
          // e.g. key: `${this.getFilename()}#index
          //      value: { timestamp: this.getFileTimeStamp(), index: index }

          if (callback) {
            callback();
          }
        });

        return this;
    }

    /**
     * Get the line of text from the file by the line number specified
     *
     * @param  {[Number]} lineNum - The line number to extract from the file
     * @param {Function} callback - The function to execute upon successful completion
     * @return {Object} This FileParser object, for method chaining
     */
    getLine(lineNum, callback) {

        if (Number(lineNum) <= 0 || Number(lineNum) >= this.lineCount) {
            throw new Error('Invalid line number');
            // throw new Exception('Invalid line number requested');
        }

        const cacheKey = `${this.fileName}#${lineNum}`;
        const cache = this.cache;

        try {
            // synchronous retrieval of cache element
            const line = this.cache.get( cacheKey, true );
            if (callback) {
                callback(line);
            }
        } catch( err ){
            // ENOTFOUND: Key not found
            console.log(`Retrieving line #${lineNum} from the file.`);

            // create a stream using the smallest possible chunk of the file, using the index
            // minPosition and maxPosition contain 2 elements [index key, index value]
            const baseLine = (Math.floor(lineNum / this.indexLineInterval) * this.indexLineInterval) + 1;
            const minPosition = (this.index[baseLine])
              ? [baseLine, this.index[baseLine]]
              : [1, 0];

            const ceilingLine = (Math.ceil(lineNum / this.indexLineInterval) * this.indexLineInterval);
            const maxPosition = (this.index[ceilingLine])
              ? [ceilingLine, this.index[ceilingLine]]
              : [this.lineCount, this.fileSize];

            const rl = readline.createInterface({
              input: fs.createReadStream(this.getFileName(), {
                flags: 'r',
                encoding: 'ASCII',
                start: minPosition[1],
                end: maxPosition[1],
              })
            });

            // scan each line with the chunk until our desired line is found
            let found = false;
            let currentLine = minPosition[0]-1;
            rl.on('line', function (line) {
                if (++currentLine == lineNum) {
                    // console.log(`Line #${currentLine} Found!: ${line}`);
                    found = true;
                    if (callback) {
                        callback(line);
                    }
                    cache.set(cacheKey, line);
                }
            })
            .on('close', function () {
                if (!found) {
                    // TODO: this is an edge case, but an error should notify the caller that
                    // the line was not found
                }
            });
        } finally {
            return this;
        }
    }
}