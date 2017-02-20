# Salsify Line Server

A solution to the Salsify Line Server Problem. This application provides an HTTP interdace to expose the contents of an ASCII text file, one line at at time. At startup, the application requires one paramter which is the path to the text file, and takes an optional second parameter which is the port number to listen for HTTP requests. By default the application will listen on port 3000, per the configuration in configs/app.js.

Upon startup, the file is scanned and an index is created by line number. By default that index is per 5000 lines.

Upon each request, the server checks the cache for the line. If it's not found in the cache, the file index is used to select a specific portion of the file to check for the correct line number. When a line is found within the file, the line will be cached for subsequent requests.

I've tested this with small files and files up to 6GB. While startup time increases with the file size, the server response time remains consistent. The only limitation at this point is the memory available for the index. To reduce memory consuption, increase the line interval within the index. For example, if an interval of 5000 lines uses ~200MB of memory, an interval of 10000 lines will use ~100MB of memory for the same file. The line interval is set in `lineServer.indexLineInterval` within config/app.js


## Usage
The only available endpoint is `/lines/XXXX`, where XXXX is the line number to be retrieved from the file. All results are cached after the first request to reduce the response time of subsequent requests. The cache object TTL can be adjusted in config/app.js. This cache is using node-cache which is destroyed when the server is stopped. A future enhancement is to switch to Memcached, which will support a distributed environment and persistent cache. The application and cache already support multiple files to be used on one or many systems.

## Setup
    sh build.sh

## Start Server
    sh run.sh _filename_ [_port number_]


## Time spent:
- 4 hours

## Code Critique:
* The getLineCount method will use `wc -l` which is a unix command to determine the number of lines within the file. While this is fast and reliable, it is only available on unix-based systems. This should be removed to use the line count following the index generation.
* I find the startup time to be acceptable, but requests on the server are slower when the line requested is further from the top of a file. A test of a request to line number 30 million was slower than a test to line 300,000, which is disappointing. I suspect that although the index may be beneficial, Node's Readable Stream object may still be somewhat inefficient when having to reposition to a start point which is gigabytes from the top of the file. I wonder if this is due to Node, or due to the fragmentation of the 6GB file on my disk.
* I did not implment any tests because my initial design was extremely simple, but didn't handle large files as nicely. I tested everything manually using curl and regretted not having written tests as the application grew in complexity. Most of the code is written in a manner which unit tests could be written against it, and I'd recommend doing this before attempting to expand functionality of the application.
* I'm not sure what the true performance gains are by the index or the cache with their current configuration, as I did not benchmark or test configuration options. However, the configuration options are cleanly presented in a configuration file which should ease deployment and setup. If time were unlimited (and if desired) these configuration settings could be accepted as startup parameters.
* With the exception of once place in the code, the application is pretty bulletproof and will correct report any processing errors.
* With respect to concurrency, I have not set up any tests to read from various points in the file concurrently due to my unfamiliarity with a utility which can support concurrent HTTP requests with dynamic URL.
* The code is compliant with the [Salsify style guide for JavaScript]

## Resources
- [Salsify style giude or JavaScript](https://github.com/salsify/javascript)
- [Node Readline Module API](https://nodejs.org/api/readline.html#readline_readline)
- [Node Readable Stream Module API](https://nodejs.org/api/stream.html#stream_class_stream_readable)
- [Node-Cache Module](https://www.npmjs.com/package/node-cache)
- Google & StackOverflow - nothing overly useful or worthy of credit

## With more time I would:
1. Write unit tests
2. Research (and hopefully) improve the performace of higher line numbers and larger files
    1. Consider breaking the file into smaller chunks, or rewrite the values of the index to correspond to the location of file segments on disk.
    2. Consider storing the entire file in memory, by line or by chunk (similar to the index approach)
    2. Do additional research on how others scan very large files
3. Write the indexes to Memchached

## Tests
:(
