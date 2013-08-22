var events = require('events'),
  util = require('util'),
  redis = require('redis');


var Pool = require('./pool');

var RedisServer = function (addr, opts) {
  events.EventEmitter.call(this);
  this.address = addr;
  this.opts = opts;
};
util.inherits(RedisServer, events.EventEmitter);

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

RedisServer.prototype.createClient = function () {
  return redis.createClient(this.address);
};

RedisServer.prototype.createPool = function () {
  return new Pool(this);
};

module.exports = RedisServer;
