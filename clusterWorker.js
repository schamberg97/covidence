/*
    This code belongs to Nicholas Schamberg and licensed to you under MIT license. See LICENSE file
*/


var path = require('path')

var productInfo = require(path.resolve(`${__dirname}/productInfo.js`))
var database = require(path.resolve(`${__dirname}/database.js`))
var webComponent = require(path.resolve(`${__dirname}/web.js`))
var cluster = require('cluster')



var randomTime = process.env.DEBUG_WORKER_RESTART_TIME || Math.floor((Math.random() * 7200000) + 3600000);
sendToMaster({
    contents: {
        code: 'start-up',
    }
});

init()

function init() {
    database.initDb(function (err, db) {
        //console.log(err || db)
        if (db) {
            var web = new webComponent(productInfo, db)
            sendToMaster({
                contents: {
                    code: 'connected-to-db',
                }
            });
            process.on('uncaughtException', function (err) {
                console.log('exception... terminating safely')
                gracefulClose(web);
                setTimeout(() => {
                    process.exit(66)
                }, 4500)
            });
            if (!process.env.DELAY) process.env.DELAY = 50
            setTimeout(() => {
                web.start()
            }, process.env.DELAY)
            console.log(process.pid + " :: I will restart in around " + Math.round(randomTime / 60000) + " minutes")
            setTimeout(gracefulClose, randomTime, web);
            process.on('disconnect', () => {
                gracefulClose(web);
            });
            
        }
        else {
            process.exit(1)
        }
    })

    

    function gracefulClose(web) {
        sendToMaster({
            contents: {
                code: 'worker-shutdown',
            }
        });
        web.stop(function (err) {
            if (err) {
                process.exit(21)
            }
            else {
                database.closeDB(function (e, o) {
                    if (err) {
                        console.log('Database is NOT cleanly shutdown.');
                        process.exit(22)
                    }
                    else {
                        console.log('Database is cleanly shutdown.');
                        //setTimeout(process.exit, 30000)
                        process.exit(0)
                    }
                })
            }
        })
    }
}