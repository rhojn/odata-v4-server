/// <reference types="mocha" />
import { ODataServer, createODataServer } from "../lib/index";
import { testFactory } from './server.spec';
import { MetaTestServer } from './metadata.spec';
import { TestServer, Foobar } from './test.model';
import { Product, Category } from "../example/model";
import * as request from 'request-promise';
import * as streamBuffers from "stream-buffers";

const extend = require("extend");
let categories = require("../example/categories");
let products = require("../example/products");
const { expect } = require("chai");

let serverCache = new WeakMap<typeof ODataServer, number>();
let serverPort = 5000;

function createTest(testcase: string, server: typeof ODataServer, command: string, compare: any, body?: any) {
    it(`${testcase} (${command})`, () => {
        let test = command.split(" ");
        let method = test[0].toLowerCase();
        let path = test.slice(1).join(" ");
        let port: number;
        if (!serverCache.has(server)){
            port = serverPort++;
            server.create(port);
            serverCache.set(server, port);
        }else{
            port = serverCache.get(server);
        }
        return request[method](`http://localhost:${port}${path}`, { json: body }, (err, response, result) => {
            if (err) {
                console.log(err);
                throw err;
            }
            if (result){
                if (typeof result == "object"){
                    result = JSON.stringify(result);
                }
                try{ result = result.replace(new RegExp(`http:\\/\\/localhost:${port}\\/`, 'gi'), 'http://localhost/'); }catch(err){}
                try{ result = JSON.parse(result); }catch(err){}
            }
            if (compare.body){
                if (typeof compare.body == "object"){
                    expect(result).to.deep.equal(JSON.parse(JSON.stringify(compare.body)));
                }else{
                    expect(result).to.equal(compare.body);
                }
            }
            if (compare.statusCode){
                expect(response.statusCode).to.equal(compare.statusCode);
            }
            if (compare.contentType){
                expect(response.headers["content-type"].indexOf(compare.contentType)).to.be.above(-1);
            }
        });
    });
}

describe("OData HTTP", () => {
    TestServer.create(3002);
    serverCache.set(TestServer, 3002);
    testFactory(createTest);

    it("should update foobar's foo property ", () => {
        return request.put(`http://localhost:3002/EntitySet(1)/foo`, { json: { foo: "PUT" } }, (err, response, result) => {
            expect(response.statusCode).to.equal(204);

            return request.get(`http://localhost:3002/EntitySet(1)`, (err, response, result) => {
                expect(JSON.parse(result)).to.deep.equal({
                    "@odata.context": "http://localhost:3002/$metadata#EntitySet/$entity",
                    "@odata.id": "http://localhost:3002/EntitySet(1)",
                    "@odata.editLink": "http://localhost:3002/EntitySet(1)",
                    id: 1,
                    foo: "PUT"
                });
            });
        });
    });

    it("should delete foobar's foo property ", () => {
        return request.delete(`http://localhost:3002/EntitySet(1)/foo`, (err, response, result) => {
            expect(response.statusCode).to.equal(204);
        }).then(_ => {
            return request.get(`http://localhost:3002/EntitySet(1)`, (err, response, result) => {
                expect(JSON.parse(result)).to.deep.equal({
                    "@odata.context": "http://localhost:3002/$metadata#EntitySet/$entity",
                    "@odata.id": "http://localhost:3002/EntitySet(1)",
                    "@odata.editLink": "http://localhost:3002/EntitySet(1)",
                    id: 1,
                    foo: null
                });
            });
        });
    });

    it("should delta update foobar's foo property ", () => {
        return request.patch(`http://localhost:3002/EntitySet(1)/foo`, { json: { foo: 'bar' } }, (err, response, result) => {
            expect(response.statusCode).to.equal(204);
        }).then(_ => {
            return request.get(`http://localhost:3002/EntitySet(1)`, (err, response, result) => {
                expect(JSON.parse(result)).to.deep.equal({
                    "@odata.context": "http://localhost:3002/$metadata#EntitySet/$entity",
                    "@odata.id": "http://localhost:3002/EntitySet(1)",
                    "@odata.editLink": "http://localhost:3002/EntitySet(1)",
                    id: 1,
                    foo: "bar"
                });
            });
        });
    });

    it("should create product reference on category", () => {
        return request.post(`http://localhost:3002/Categories('578f2baa12eaebabec4af28e')/Products('578f2b8c12eaebabec4af242')/$ref`, (err, response, result) => {
            expect(response.statusCode).to.equal(204);
        }).then(_ => {
            return request.get(`http://localhost:3002/Products('578f2b8c12eaebabec4af242')/Category`, (err, response, result) => {
                expect(JSON.parse(result)).to.deep.equal({
                    "@odata.context": "http://localhost:3002/$metadata#Categories/$entity",
                    "@odata.id": "http://localhost:3002/Categories('578f2baa12eaebabec4af28e')",
                    "Description": "Sweet and savory sauces",
                    "Name": "Condiments",
                    "_id": "578f2baa12eaebabec4af28e"
                });
            });
        });
    });

    it("should update product reference on category", () => {
        return request.put(`http://localhost:3002/Categories('578f2baa12eaebabec4af28e')/Products('578f2b8c12eaebabec4af242')/$ref`, (err, response, result) => {
            expect(response.statusCode).to.equal(204);
        }).then(_ => {
            return request.get(`http://localhost:3002/Products('578f2b8c12eaebabec4af242')/Category`, (err, response, result) => {
                expect(JSON.parse(result)).to.deep.equal({
                    "@odata.context": "http://localhost:3002/$metadata#Categories/$entity",
                    "@odata.id": "http://localhost:3002/Categories('578f2baa12eaebabec4af28e')",
                    "Description": "Sweet and savory sauces",
                    "Name": "Condiments",
                    "_id": "578f2baa12eaebabec4af28e"
                });
            });
        });
    });

    it("should delta update product reference on category", () => {
        return request.patch(`http://localhost:3002/Categories('578f2baa12eaebabec4af28e')/Products('578f2b8c12eaebabec4af242')/$ref`, (err, req, result) => {
            expect(req.statusCode).to.equal(204);
        }).then(_ => {
            return request.get(`http://localhost:3002/Products('578f2b8c12eaebabec4af242')/Category`, (err, response, result) => {
                expect(JSON.parse(result)).to.deep.equal({
                    "@odata.context": "http://localhost:3002/$metadata#Categories/$entity",
                    "@odata.id": "http://localhost:3002/Categories('578f2baa12eaebabec4af28e')",
                    "Description": "Sweet and savory sauces",
                    "Name": "Condiments",
                    "_id": "578f2baa12eaebabec4af28e"
                });
            });
        });
    });

    it("should delete product reference on category", () => {
        return request.delete(`http://localhost:3002/Categories('578f2baa12eaebabec4af28e')/Products('578f2b8c12eaebabec4af242')/$ref`, (err, req, result) => {
            expect(req.statusCode).to.equal(204);
        }).then(_ => {
            return request.get(`http://localhost:3002/Products('578f2b8c12eaebabec4af242')/Category`, (err) => {
                if (err) return expect(err.name).to.equal("ResourceNotFoundError");
                throw new Error("Category reference should be deleted.");
            });
        });
    });

    it("should delete product reference on category by ref id", () => {
        return request.delete(`http://localhost:3002/Categories('578f2baa12eaebabec4af28b')/Products/$ref?$id=http://localhost:3002/Products('578f2b8c12eaebabec4af284')`, (err, req, result) => {
            expect(req.statusCode).to.equal(204);
        }).then(_ => {
            return request.get(`http://localhost:3002/Products('578f2b8c12eaebabec4af284')/Category`, (err) => {
                if (err) return expect(err.name).to.equal("ResourceNotFoundError");
                throw new Error("Category reference should be deleted.");
            });
        });
    });

    it("should create category reference on product", () => {
        return request.post(`http://localhost:3002/Products('578f2b8c12eaebabec4af286')/Category/$ref`, { json: { "@odata.id": "http://localhost:3002/Categories('578f2baa12eaebabec4af28c')" } }, (err, req, result) => {
            expect(req.statusCode).to.equal(204);
        }).then(_ => {
            return request.get(`http://localhost:3002/Products('578f2b8c12eaebabec4af242')/Category`, (err, response, result) => {
                expect(JSON.parse(result)).to.deep.equal({
                    statusCode: 200,
                    body: extend({
                        "@odata.context": "http://localhost:3002/$metadata#Categories/$entity"
                    }, categories.filter(category => category._id.toString() == "578f2baa12eaebabec4af28c").map(category => extend({
                        "@odata.id": `http://localhost:3002/Categories('${category._id}')`
                    }, category))[0]
                    ),
                    elementType: Category,
                    contentType: "application/json"
                });
            });
        });
    });

    it("should update category reference on product", () => {
        return request.put(`http://localhost:3002/Products('578f2b8c12eaebabec4af286')/Category/$ref`, { json: { "@odata.id": "http://localhost:3002/Categories('578f2baa12eaebabec4af28c')" } }, (err, req, result) => {
            expect(req.statusCode).to.equal(204);
        }).then(_ => {
            return request.get(`http://localhost:3002/Products('578f2b8c12eaebabec4af286')/Category`, (err, response, result) => {
                expect(JSON.parse(result)).to.deep.equal({
                    "@odata.context": "http://localhost:3002/$metadata#Categories/$entity",
                    "@odata.id": "http://localhost:3002/Categories('578f2baa12eaebabec4af28c')",
                    "Description": "Dried fruit and bean curd",
                    "Name": "Produce",
                    "_id": "578f2baa12eaebabec4af28c"
                });
            });
        });
    });

    it("should delete category reference on product", () => {
        return request.delete(`http://localhost:3002/Products('578f2b8c12eaebabec4af288')/Category/$ref`, { json: { "@odata.id": "http://localhost:3002/Categories('578f2baa12eaebabec4af28e')" } }, (err, req, result) => {
            expect(req.statusCode).to.equal(204);
        }).then(_ => {
            return request.get(`http://localhost:3002/Products('578f2b8c12eaebabec4af288')/Category`, (err) => {
                if (err) return expect(err.name).to.equal("ResourceNotFoundError");
                throw new Error("Category reference should be deleted.");
            });
        });
    });

    describe("Stream properties", () => {
        it("stream property POST", (done) => {
            let readableStrBuffer = new streamBuffers.ReadableStreamBuffer();
            let req = request.post(`http://localhost:3002/ImagesControllerEntitySet(1)/Data`);
            readableStrBuffer.pipe(req);
            readableStrBuffer.put('tmp.png');
            req.on('error', (err) => {
                done(err);
            });
            req.on('complete', (resp, body) => {
                console.log(body);
                expect(resp.statusCode).to.equal(204);
                done();
            });
        });
    });

    describe("Media entity", () => {
        it("media entity POST", (done) => {
            let readableStrBuffer = new streamBuffers.ReadableStreamBuffer();
            let req = request.post(`http://localhost:3002/MusicControllerEntitySet(1)/$value`);
            readableStrBuffer.pipe(req);
            readableStrBuffer.put('tmp.png');
            req.on('error', (err) => {
                done(err);
            });
            req.on('complete', (resp, body) => {
                console.log(body);
                expect(resp.statusCode).to.equal(204);
                done();
            });
        });
    });
});
