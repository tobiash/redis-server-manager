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

  afterEach(rs.shutdownAll.bind(rs));

  describe('#byName()', function () {

    before(function () {
      nconf.file(path.resolve(__dirname, 'fixtures/config.json'));
      rs.setConfig(nconf.get('redis:servers'));
    });

    it('should provide pre-configured cache server', function (done) {
      rs.byName('cache', function (err, s) {
        expect(err).not.to.be.defined;
        expect(s).to.be.defined;
        expect(s.ready).to.be.true;
        done(err);
      });
    });

    it('should return a server instance before it\'s ready', function () {
      var server = rs.byName('cache', function () {});
      expect(server).to.be.defined;
      expect(server.ready).to.be.false;
    });


    // TODO Test correct server shutdown

  });

  describe('Server instances', function () {

    describe('pre-ready', function () {

      var server, pool;

      describe('#createClient', function () {

        it('should return null and call a callback', function (done) {
          server = rs.createTestServer(function () {});
          var client = server.createClient(function cb(err, client) {
            expect(err).to.not.exist;
            expect(client).to.exist;
            expect(server.ready).to.equal(true);
            done();
          });
          expect(client).to.not.exist;
        });

        it('should throw error if not ready and no callback', function () {
          server = rs.createTestServer(function () {});
          (function () {
            server.createClient();
          }).should.throw();
        });

      });

      it('pools should delay clients until server is ready', function (done) {
        server = rs.createTestServer(function () {});
        expect(server).to.exist.and.have.property('ready', false);
        pool = server.createPool();
        expect(pool).to.exist;

        pool.shared(function (err, client) {
          expect(server.ready).to.equal(true);
          expect(client).to.exist;
          done();
        });
      });

    });

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
