// Setup mocha environment
global.sinon = require('sinon');
global.chai = require('chai');
chai.use(require('sinon-chai'));
chai.should();
global.expect = chai.expect;
global.inspect = require('eyes').inspector();
