import { ObjectID } from "mongodb";
import { Token } from "odata-v4-parser/lib/lexer";
import { createFilter } from "odata-v4-inmemory";
import * as extend from "extend";
import { odata, ODataController, ODataServer } from "../lib/index";
let categories = require("./categories").map((category) => {
    category._id = category._id.toString();
    return category;
});
let products = require("./products").map((product) => {
    product._id = product._id.toString();
    product.CategoryId = product.CategoryId.toString();
    return product;
});

export class ProductsController extends ODataController{
    @odata.GET
    find(@odata.filter filter:Token){
        if (filter) return products.filter(createFilter(filter));
        return products;
    }

    @odata.GET
    findOne(@odata.key key:string){
        return products.filter(product => product._id == key)[0];
    }

    @odata.POST
    insert(@odata.body product:any){
        product._id = new ObjectID().toString();
        products.push(product);
        return product;
    }

    @odata.PATCH
    update(@odata.key key:string, @odata.body delta:any){
        extend(products.filter(product => product._id == key)[0], delta);
    }

    @odata.DELETE
    remove(@odata.key key:string){
        products.splice(products.indexOf(products.filter(product => product._id == key)[0]), 1);
    }
}

export class CategoriesController extends ODataController{
    @odata.GET
    find(@odata.filter filter:Token){
        if (filter) return categories.filter(createFilter(filter));
        return categories;
    }

    @odata.GET
    findOne(@odata.key key:string){
        return categories.filter(category => category._id == key)[0];
    }

    @odata.POST
    insert(@odata.body category:any){
        category._id = new ObjectID().toString();
        categories.push(category);
        return category;
    }

    @odata.PATCH
    update(@odata.key key:string, @odata.body delta:any){
        extend(categories.filter(category => category._id == key)[0], delta);
    }

    @odata.DELETE
    remove(@odata.key key:string){
        categories.splice(categories.indexOf(categories.filter(category => category._id == key)[0]), 1);
    }
}

@odata.cors
@odata.controller(ProductsController, true)
@odata.controller(CategoriesController, true)
export class NorthwindODataServer extends ODataServer{}
NorthwindODataServer.create("/odata", 3000);