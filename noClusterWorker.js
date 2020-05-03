/*
    This code belongs to Nicholas Schamberg and licensed to you under MIT license. See LICENSE file
*/

var path = require('path')

var productInfo = require(path.resolve(`${__dirname}/productInfo.js`))
var database = require(path.resolve(`${__dirname}/database.js`))
var webComponent = require(path.resolve(`${__dirname}/web.js`))
var cluster = require('cluster')

database.initDb(function (err, db) {
    if (db) {
        process.env.FIRST_WORKER = true
        var web = new webComponent(productInfo, db)
        web.start()
    }
    else {
        process.exit(1)
    }
})