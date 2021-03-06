var assert = require('assert');
var should = require('should');
var loopback = require('loopback');

describe('swagger connector', function() {
  describe('swagger spec validatation against Swagger 2.0 specification',
    function() {
      it('when opted validates swagger spec: invalid spec',
        function(done) {
          var dsErrorProne =
            createDataSource({ 'swagger': { 'version': '2.0' }}, true);
          dsErrorProne.on('error', function(err) {
            should.exist(err);
            done();
          });
        });

      it('when opted validates swagger spec: valid spec',
        function(done) {
          var ds = createDataSource('http://petstore.swagger.io/v2/swagger.json');
          ds.on('connected', function() {
            ds.connector.should.have.property('client');
            ds.connector.client.should.have.property('apis');
            done();
          });
        });
    });

  describe('swagger client generation', function() {
    it('generates client from swagger spec url',
      function(done) {
        var ds = createDataSource('http://petstore.swagger.io/v2/swagger.json');
        ds.on('connected', function() {
          ds.connector.should.have.property('client');
          ds.connector.client.should.have.property('apis');
          done();
        });
      });

    it('generates client from local swagger spec - .json file',
      function(done) {
        var ds = createDataSource('test/fixtures/petStore.json');
        ds.on('connected', function() {
          ds.connector.should.have.property('client');
          ds.connector.client.should.have.property('apis');
          done();
        });
      });

    it('generates client from local swagger spec - .yaml file',
      function(done) {
        var ds = createDataSource('test/fixtures/petStore.yaml');
        ds.on('connected', function() {
          ds.connector.should.have.property('client');
          ds.connector.client.should.have.property('apis');
          done();
        });
      });

    it('generates client from swagger spec object',
      function(done) {
        var ds = createDataSource(require('./fixtures/petStore'));
        ds.on('connected', function() {
          ds.connector.should.have.property('client');
          ds.connector.client.should.have.property('apis');
          done();
        });
      });
  });

  describe('models', function() {
    describe('models without remotingEnabled', function() {
      var ds;
      before(function(done) {
        ds = createDataSource('test/fixtures/petStore.json');
        ds.on('connected', function() {
          done();
        });
      });

      it('creates models', function(done) {
        var PetService = ds.createModel('PetService', {});
        (typeof PetService.getPetById).should.eql('function');
        (typeof PetService.addPet).should.eql('function');
        done();
      });

      it('supports model methods', function(done) {
        var PetService = ds.createModel('PetService', {});
        PetService.getPetById({ petId: 1 }, function(err, res) {
          should.not.exist(err);
          res.status.should.eql(200);
          done();
        });
      });
    });
    // out of scope of initial release
    describe.skip('models with remotingEnabled', function() {
      before(function(done) {
        ds = createDataSource('test/fixtures/petStore.json', false, true);
        ds.on('connected', function() {
          done();
        });
      });

      it('creates models', function(done) {
        var PetService = ds.createModel('PetService', {});
        (typeof PetService.getPetById).should.eql('function');
        PetService.getPetById.shared.should.be.true;
        (typeof PetService.addPet).should.eql('function');
        PetService.addPet.shared.should.be.true;
        done();
      });
    });
  });

  describe('Swagger invocations', function() {
    var ds, PetService;

    before(function(done) {
      ds = createDataSource('test/fixtures/petStore.json');
      ds.on('connected', function() {
        PetService = ds.createModel('PetService', {});
        done();
      });
    });

    it('invokes the PetService', function(done) {
      PetService.getPetById({ petId: 1 }, function(err, res) {
        res.status.should.eql(200);
        done();
      });
    });

    it('supports a request for xml content', function(done) {
      PetService.getPetById({ petId: 1 },
        { responseContentType: 'application/xml' },
          function(err, res) {
            should.not.exist(err);
            res.status.should.eql(200);
            res.headers['content-type'].should.eql('application/xml');
            done();
          });
    });

    it('invokes connector-hooks', function(done) {
      var events = [];
      var connector = ds.connector;
      connector.observe('before execute', function(ctx, next) {
        assert(ctx.req);
        events.push('before execute');
        next();
      });
      connector.observe('after execute', function(ctx, next) {
        assert(ctx.res);
        events.push('after execute');
        next();
      });
      PetService.getPetById({ petId: 1 }, function(err, response) {
        assert.deepEqual(events, ['before execute', 'after execute']);
        done();
      });
    });
  });
});


function createDataSource(spec, validateSpec, remotingEnabled) {
  return loopback.createDataSource('swagger', {
    connector: require('../index'),
    spec: spec,
    validate: validateSpec,
    remotingEnabled: remotingEnabled,
  });
}
