var stream = require('stream'),
  spawn = require('child_process').spawn,
  debug = require('debug')('redis-server-manager'),
  StoppableRedisServer = require('./stoppable-redis-server');


module.exports = function (rbin) {

  /**
   * Start a redis server instance.
   *
   * @param {String} addr Address that the Redis server will respond to
   * @param {Array} args Command line arguments for the server
   * @param {Function} cb Callback to run when the server is up and ready
   *  to receive connections
   * @return {RedisServer} Redis server instance. Not that this server will typically
   *  not be ready to receive connections after returning, use the provided callback
   *  to wait for the server to become ready.
   */
  return function (addr, args, cb) {
    var server = new StoppableRedisServer(addr);
    server.child = spawn(rbin, args);
    server.ready = false;
    // Parse console output
    var rest = '',
      rstream = new stream.Writable();
    rstream._write = function (chunk, encoding, done) {
      var str = rest + chunk.toString();
      debug('%s stdout: %s', addr, str);
      var lines = str.split('\n');
      rest = lines.pop();
      if (str.indexOf('error') >= 0 || str.indexOf('Error') >= 0) {
        server.emit('error', new Error(str));
      } else if (str.indexOf('The server is now ready to accept connections') >= 0) {
        debug('%s is ready', addr);
        server.ready = true;
        server.emit('ready');
        server.child.stdout.unpipe(rstream);
        if (typeof cb === 'function') {
          cb(null, server);
        }
      }
      done(null);
    };
    server.child.stdout.pipe(rstream);
    server.child.on('error', function (err) {
      debug('Child error %j', err);
      server.emit('error', new Error('Child process error', err));
    });
    server.child.on('exit', function (r) {
      debug('Child exit %d', r);
      if (!server.stopped || r > 0)  {
        server.emit('error', new Error('Child process exited unexpectedly with code ' + r));
      }
    });
    return server;
  };
};
