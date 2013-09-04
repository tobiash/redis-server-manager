var events = require('events'),
  util = require('util'),
  redis = require('redis'),
  Pool = require('./pool');

var RedisServer = function (addr, opts) {
  events.EventEmitter.call(this);
  this.address = addr;
  this.opts = opts;
};
util.inherits(RedisServer, events.EventEmitter);

/**
 * Runs a function once the server is ready
 */
RedisServer.prototype.whenReady = function (fn) {
  if (this.ready) {
    return process.nextTick(fn.bind(null, this));
  } else {
    this.once('ready', fn.bind(null, this));
  }
};

RedisServer.prototype.createMonitor = function (debug, cb) {
  var monitor = this.createClient();
  monitor.monitor(function (err, res) {
    debug('[MONITOR] Entering Redis Monitor mode');
    cb(err);
  });
  monitor.on('monitor', function (time, args) {
    debug('[MONITOR] %s : %j', time, args);
  });
  return monitor;
};

/**
 * Create a client.
 *
 * This function has two behaviours:
 *
 * - When the server is ready, it can be used synchronously and
 *   asynchronously. The function returns a working node_redis
 *   client and will also call any provided callbacks with the
 *   created client.
 * - When the server is not yet ready, it will return null and
 *   call the callback with the client once the server is ready.
 *   If the server is not ready and no callback is provided,
 *   an error is thrown.
 */
RedisServer.prototype.createClient = function (cb) {
  if (this.ready) {
    var client = redis.createClient(this.address);
    if (typeof cb === 'function') { process.nextTick(cb.bind(null, null, client)); }
    return client;
  } else {
    // Server not ready, accept only asynchronous calls
    if (typeof cb !== 'function') {
      throw new Error('Server is not ready, must call asynchronously');
    }
    this.whenReady(function (server) {
      cb.call(null, null, redis.createClient(server.address));
    });
  }
};

RedisServer.prototype.createPool = function () {
  return new Pool(this);
};

module.exports = RedisServer;
