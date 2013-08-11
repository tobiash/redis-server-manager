var util = require('util'),
  RedisServer = require('./redis-server');

// Describes a redis server that can be stopped. This
// is the case when the node process manages the redis
// server as a child process.
var StoppableRedisServer = function () {
  RedisServer.apply(this, arguments);
  this.activeClients = [];
};
util.inherits(StoppableRedisServer, RedisServer);

StoppableRedisServer.prototype.createClient = function () {
  var client = RedisServer.prototype.createClient.apply(this, arguments);
  this.activeClients.push(client);
  return client;
};

// Kills the redis server
StoppableRedisServer.prototype.stop = function () {
  // TODO Quit clients
  this.stopped = true;
  this.child.kill();
  this.emit('stop');
  this.ready = false;
};

module.exports = StoppableRedisServer;
