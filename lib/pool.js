var events = require('events'),
  util = require('util'),
  genPool = require('generic-pool');

function Pool(server, opts) {
  this._sharedConn = server.createClient();

  // Disable watch for the shared connection
  this._sharedConn.watch = null;

  var pool = this._pool = genPool.Pool({
    create: function (callback) {
      var client = server.createClient();
      client.release = function () {
        pool.release(client);
      };
      callback(null, client);
    },
    destroy: function (client) {
      client.quit();
    }
  });
  this.opts = opts || {};
}

/**
 * Acquire the shared connection. This is to be used for operations
 * that don't require optimistic locking via `watch`.
 *
 * Asynchronous API for consistency and extensibility.
 */
Pool.prototype.shared = function (cb) {
  process.nextTick(cb.bind(null, null, this._sharedConn));
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
