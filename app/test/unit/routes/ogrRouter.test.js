'use strict';
var logger = require('logger');
var should = require('should');
var assert = require('assert');
var sinon = require('sinon');
var config = require('config');
var ogrRouter = require('routes/api/v1/ogrRouter');
var path = require('path');
var fs = require('fs-extra');


var stat = function(path) {
    return function(callback) {
        fs.stat(path, callback);
    };
};

var unlink = function(file) {
    return function(callback) {
        fs.unlink(file, callback);
    };
};


describe('Check /convert route', function() {

    var ctx = {
        assert: function() {
            return false;
        },
        request: {
            body: {
                files: {
                    file: {
                        path: path.join('/tmp', 'shape.zip')
                    }
                }
            }
        },
        body: null
    };
    var ctxInvalid = {
        assert: function() {
            return false;
        },
        request: {
            body: {
                files: {
                    file: {
                        path: path.join('/tmp', 'invalid.zip')
                    }
                }
            }
        },
        body: null,
        throw: function(status, message) {
            this.status = status;
            this.body = message;
        }
    };

    var ctxInvalidNotParam = {
        assert: function(param, status, message) {
            if (!param) {
                this.throw(status, message);
                throw new Error();
            }
        },
        request: {
            body: {
                files: {

                }
            }
        },
        body: null,
        throw: function(status, message) {
            this.status = status;
            this.body = message;
        }
    };
    let url = '/ogr/convert';
    let method = 'POST';
    let func = null;
    before(function*() {

        for (let i = 0, length = ogrRouter.stack.length; i < length; i++) {
            if (ogrRouter.stack[i].regexp.test(url) && ogrRouter.stack[i].methods.indexOf(method) >= 0) {
                func = ogrRouter.stack[i].stack[1];
            }
        }

    });
    describe('valid files', function() {
        beforeEach(function*() {
            logger.debug('Copying file');
            fs.copySync(path.join(__dirname, '../files/shape.zip'), path.join('/tmp', 'shape.zip'));
        });


        it('Convert valid file', function*() {
            let funcTest = func.bind(ctx);
            funcTest.should.be.a.Function();
            yield funcTest();
            ctx.body.should.not.be.null();
            ctx.body.should.have.property('data');
            let data = ctx.body.data;
            data.should.have.property('type');
            data.should.have.property('attributes');
            data.should.have.property('id');
            data.type.should.equal('geoJSON');

            let resultStat = null;
            try {
                resultStat = yield stat(ctx.request.body.files.file.path);
                //if not return exception, fail
                true.should.be.equal(false);
            } catch (e) {
                e.should.be.a.Error();
            }
            should(resultStat).be.null();
        });

        afterEach(function*() {
            try {
                yield unlink(path.join('/tmp', 'shape.zip'));
            } catch (e) {

            }
        });
    });

    describe('Invalid files', function() {
        beforeEach(function*() {
            logger.debug('Copying file');
            fs.copySync(path.join(__dirname, '../files/invalid.zip'), path.join('/tmp', 'invalid.zip'));
        });

        it('Convert invalid file', function*() {

            let funcTest = func.bind(ctxInvalid);
            funcTest.should.be.a.Function();
            let resultStat = null;
            try {
                yield funcTest();
                ctxInvalid.status.should.be.equal(400);

                resultStat = yield stat(ctxInvalid.request.body.files.file.path);

            } catch (e) {
                e.should.be.a.Error();
            }
            should(resultStat).be.null();

        });
        afterEach(function*() {
            try {
                yield unlink(path.join('/tmp', 'invalid.zip'));
            } catch (e) {

            }
        });
    });
    describe('Not file param', function() {
        it('Check file in body', function*() {

            let funcTest = func.bind(ctxInvalidNotParam);
            funcTest.should.be.a.Function();
            let resultStat = null;
            try {
                yield funcTest();
                ctxInvalid.status.should.be.equal(400);

            } catch (e) {

                e.should.be.a.Error();
            }
            should(resultStat).be.null();
        });
    });
});
