var request = require('supertest');
var expect = require('chai').expect;
var Joi = require('joi');
var app = require('express')();
var BodyParser = require('body-parser');
var Validate = require('../');

app.use(BodyParser.json());

var querySchema = {
  query: {
    limit: Joi.number().default(20),
    offset: Joi.number().default(20)
  }
};
var paramsSchema = {
  params: {
    id: Joi.number().required()
  }
};
var bodySchema = {
  body: {
    name: Joi.string().required()
  }
};

var headersSchema = {
  params: {
    id: Joi.string().required()
  },
  headers: {
    authorization: Joi.string().required()
  }
};

var responseSchema = {
  response: Joi.object().keys({
    id: Joi.number().positive().required().description('identifier')
  }).required().description('payload')
}

app.get('/users/one/:id', Validate(headersSchema), function (req, res, next) {
  res.send({
    ...req.headers,
    id: req.params.id
  });
});

app.get('/users', Validate(querySchema), function (req, res, next) {
  res.send(req.query);
});

app.get('/users/:id', Validate(paramsSchema), function (req, res, next) {
  res.send(req.params);
});

app.post('/users', Validate(bodySchema), function (req, res, next) {
  res.send(req.body);
});

app.get('/response/:id', Validate(responseSchema), (req, res) => {
  const id = +req.params.id || 'none'
  res.sendValidJson({ id })
})

app.get('/', Validate(), function (req, res, next) {
  res.send();
});

// Error handling middleware to make sure the response passed back
app.use(function (err, req, res, next) {
  res.status(err.output.statusCode).send(err.output.payload);
});

describe('express-joi-validator tests', function () {

  it('should return 400 bad request if the url param is invalid', function (done) {
    request(app)
      .get('/users/jack')
      .expect(400)
      .expect(function (res) {
        expect(res.body.statusCode).to.equal(400);
        expect(res.body.error).to.equal('Bad Request');
        expect(res.body.message).to.match(/"id" must be a number/);
      })
      .end(done);
  });

  it('should return 400 bad request if the query param is invalid', function (done) {
    request(app)
      .get('/users?limit=ten')
      .expect(400)
      .expect(function (res) {
        expect(res.body.statusCode).to.equal(400);
        expect(res.body.error).to.equal('Bad Request');
        expect(res.body.message).to.match(/"limit" must be a number/);
      })
      .end(done);
  });

  it('should return 400 bad request if the POST\'d body is invalid', function (done) {
    request(app)
      .post('/users')
      .expect(400)
      .expect(function (res) {
        expect(res.body.statusCode).to.equal(400);
        expect(res.body.error).to.equal('Bad Request');
        expect(res.body.message).to.match(/"name" is required/);
      })
      .end(done);
  });

  it('should return 200 if the query param is valid and override the default values if specified', function (done) {
    request(app)
      .get('/users?limit=10')
      .expect(200)
      .expect(function (res) {
        expect(res.body.limit).to.equal(10);
        expect(res.body.offset).to.equal(20);
      })
      .end(done);
  });

  it('should return 200 even if there\'s no schema to validate', function (done) {
    request(app)
      .get('/')
      .expect(200)
      .end(done);
  });

  it('should return 200 for header validation', function (done) {
    request(app)
      .get('/users/one/first')
      .set('Authorization', 'abc123')
      .expect(200)
      .expect(function (res) {
        expect(res.body.authorization).to.equal('abc123');
        expect(res.body.id).to.equal('first');
      })
      .end(done);
  });

  it('should return a 500 for response validation', function (done) {
    request(app)
      .get('/response/one')
      .expect(500)
      .expect(function (res) {
        expect(res.body.statusCode).to.equal(500);
      })
      .end(done);
  });
  it('should return a 200 for correct response validation', function () {
    return request(app)
      .get('/response/1')
      .expect(200)
  });

});


