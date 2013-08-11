/*jslint expr: true */
var rs = require('../index'),
  nconf = require('nconf'),
  path = require('path'),
  semver = require('semver');

describe('Redis Server', function () {

  it('should find redis >= 2.6.12', function (done) {
    rs.getInfo(function (err, info) {
      expect(err).to.not.exist;
      expect(semver.satisfies(info.v, '>= 2.6.12')).to.be.true;
      done();
    });
  });

  describe('#byName()', function () {

    it('should provide pre-configured cache server', function (done) {
      nconf.file(path.resolve(__dirname, 'fixtures/config.json'));
      rs.byName('cache', function (err, s) {
        expect(s).to.be.defined;
        expect(s.ready).to.be.true;
        done(err);
      });
    });

    // TODO Test correct server shutdown

  });

  describe('Server instances', function () {

  });

  describe('Test Server instances', function () {

    var server;

    beforeEach(function (done) {
      rs.createTestServer(function (err, s) {
        server= s;
        done();
      });
    });

    afterEach(function () {
      server.stop();
    });

    it('should be an event emitter', function () {
      server.should.be.an.instanceOf(require('events').EventEmitter);
    });

    it('should give a client', function (done) {
      var c = server.createClient();
      c.info(function (err, info) {
        var result = {};
        info.split('\n').forEach(function (line) {
          var match;
          if ((match = /^([^:]+):(\S+)\s*$/.exec(line))) {
            result[match[1]] = match[2];
          }
        });
        c.quit();
        done();
      });
    });

  });

});
