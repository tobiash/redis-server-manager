redis-server-manager
====================

Manage [Redis](http://redis.io) server instances in Node. The following features are
provided:

 * Spin up redis instances as child processes of your node process
 * Manage redis servers that are already running somewhere
 * Create temporary redis servers (for testing)
 * Find out which version of `redis-server` is installed
 * Pool redis client connections

_This is a work in progress. Most features are working and I use this
project for some of my personal projects already, but there is still
some cleanup and bug-fixing required._


Starting managed redis instances
--------------------------------


