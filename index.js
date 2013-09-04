var fs = require('fs'),
  events = require('events'),
  util = require('util'),
  spawn = require('child_process').spawn,
  async = require('async'),
  debug = require('debug')('redis-server-manager'),
  stream = require('stream'),
  temp = require('temp');


/**
 * Redis Server Manager
 * ====================
 *
 * This is the main entry for redis-server-manager.
 *
 */
var rbin = 'redis-server',
  RedisServer = require('./lib/redis-server'),
  StoppableRedisServer = require('./lib/stoppable-redis-server');


// List of named redis servers
var namedServers = {}, serverConfig = {};


var redis = module.exports = {

  /*
   * Gathers some information about the redis installation
   */
  getInfo: require('./lib/getinfo')(rbin),

  /*
   * Starts up a redis server with the given command-line `args`.
   * `cb` is called whith the server object when the server is ready
   * to accept connections. Alternatively, the function returns the
   * server object and you may listen for a 'ready' event.
   */
  startServer: require('./lib/start')(rbin),

  /*
   * Starts up a redis server with a given configuration (as string)
   */
  startServerFromConfig: function (addr, config, cb) {
    var server = redis.startServer(addr, ['-'], cb);
    server.child.stdin.write(config);
    server.child.stdin.end();
    return server;
  },

  createServer: function (addr, opts) {
    return new RedisServer(addr, opts);
  },

  createTestServer: function (cb) {
    var socket = temp.path({suffix: '.sock'});
    var config = "port 0\n" +
      "unixsocket " + socket + "\n" +
      "unixsocketperm 755";
    return redis.startServerFromConfig(socket, config, cb);
  },

  // Helper to create clients from an options hash
  //
  // Options may contain one of
  //
  // - `createClient`
  //   A synchronous function that creates a single client.
  //
  // - `server`
  //   A redis server object or a string key of a named server
  //
  // - `clients`
  //   Pre-configured clients object/array
  //
  createClients: function (createFromServer, options) {
    if (typeof createFromServer === 'object') {
      options = createFromServer;
      // Default to creating a single client
      createFromServer = function (server) {
        return server.createClient();
      };
    }

    var clients, clientsWait;
    // Fall-through for pre-configured clients
    if (options.clients) {
      clients = options.clients;
    }

    function returnClients(cb) {
      process.nextTick(function () {
        debug("Clients %j", Object.keys(clients));
        cb(null, clients);
      });
    }

    function doCreateFromServer(server, cb) {
      debug("Creating from server");
      clients = createFromServer(server);
      if (!clients) {
        return cb(new Error('Could not create clients!'));
      }
      clientsWait.emit('ready');
      returnClients(cb);
    }

    // Create clients from a server object or name
    function fromServer(server, cb) {
      clientsWait = new events.EventEmitter();
      switch (typeof server) {
      case 'string':
        redis.byName(server, function (err, s) {
          if (err) {
            return cb(err);
          }
          doCreateFromServer(s, cb);
        });
        break;
      case 'object':
        process.nextTick(doCreateFromServer.bind(undefined, server, cb));
        break;
      default:
        cb(new Error('Invalid server option', server));
      }
    }

    function fn(cb) {
      if (clients) {
        // Return clients right away
        returnClients(cb);
      } else if (clientsWait) {
        // Wait for a client being constructed
        clientsWait.once('ready', returnClients.bind(undefined, cb));
      } else {
        // Create a new client
        if (options.createClient) {
          clients = options.createClient();
          returnClients(cb);
        } else if (options.server) {
          fromServer(options.server, cb);
        } else {
          cb(new Error('Invalid options hash, could not create Redis client!'));
        }
      }
    }

    fn.reset = function () {
      if (clients && clients.quit) {
        clients.quit();
      }
      clientsWait = clients = undefined;
    };
    
    return fn;
  },

  setConfig: function (config) {
    serverConfig = config;
  },

  // Get a pre-configured redis-server by name
  byName: function (name, cb) {
    var server;
    if (!!(server = namedServers[name])) {
      if (server.ready) {
        cb(null, server);
      } else {
        server.once('ready', function () {
          cb(null, server);
        });
      }
      return server;
    }

    // Try to start up the server from configuration
    var conf = serverConfig[name];
    if (!conf) {
      return cb(new Error('Named redis server "' + name + '" not found!'));
    }

    if (conf.config && conf.address) {
      debug('Spinning up Redis instance %s', name);
      namedServers[name] = server = redis.startServerFromConfig(conf.address, conf.config, cb);
    } else if (conf.args && conf.address) {
      debug('Spinning up Redis instance %s', name);
      namedServers[name] = server = redis.startServer(conf.address, conf.args, cb);
      server.once('stop', function () {
        delete namedServers[name];
      });
    } else {
      return cb(new Error('Invalid configuration for redis server "' + name + '"'));
    }
    server.once('stop', function () {
      delete namedServers[name];
    });
    return server;
  },

  shutdownAll: function () {
    Object.keys(namedServers).forEach(function (key) {
      debug('Shutting down managed Redis "%s"', key);
      namedServers[key].stop();
    });
    namedServers = {};
  }

};

process.on('exit', function () {
  redis.shutdownAll();
});
