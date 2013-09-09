var events = require('events'),
  util = require('util'),
  genPool = require('generic-pool');

/**
 * Redis connection pool
 * =====================
 *
 * Pools node_redis client connections to a Redis server.
 * Provides a shared client that can be used for most tasks,
 * and creates and pools exclusive clients. These clients
 * might be used for subscriptions or the WATCH command that
 * might collide with other operations.
 *
 */
function Pool(server, opts) {
  events.EventEmitter.call(this);
  this.ready = server.ready;

  var pool = this._pool = genPool.Pool({
    create: function (callback) {
      server.createClient(function (err, client) {
        client.release = function () {
          pool.release(client);
        };
        callback(null, client);
      });
    },
    destroy: function (client) {
      client.quit();
    },
    max: 30
  });
  this.opts = opts || {};

  if (server.ready) {
    this._onServerReady(server);
  } else {
    server.once('ready', this._onServerReady.bind(this, server));
  }
}

util.inherits(Pool, events.EventEmitter);

Pool.prototype._onServerReady = function (server) {
  this._sharedConn = server.createClient();

  // Disable watch for the shared connection
  this._sharedConn.watch = null;

  this.ready = true;
  this.emit('ready');
};

Pool.prototype.whenReady = function (fn) {
  if (this.ready) {
    return process.nextTick(fn.bind(this, this));
  } else {
    this.once('ready', fn.bind(this, this));
  }
};

/**
 * Acquire the shared connection. This is to be used for operations
 * that don't require optimistic locking via `watch`.
 */
Pool.prototype.shared = function (cb) {
  this.whenReady(function (pool) {
    cb(null, pool._sharedConn);
  });
};

/**
 * Acquire an exclusive connection
 *
 */
Pool.prototype.exclusive = function (cb) {
  this._pool.acquire(cb);
};


Pool.prototype.quit = function (cb) {
  var pool = this._pool;
  pool.drain(function () {
    pool.destroyAllNow(cb);
  });
  this._sharedConn.quit();
};

module.exports = Pool;
