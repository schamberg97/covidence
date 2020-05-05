var express = require('express')
var bodyParser = require('body-parser');

var open = require('open')

var cluster = require('cluster')

var helmet = require('helmet');
var expurl = require('express-normalizeurl');
const expressSanitizer = require('express-sanitizer');
var fs = require('fs')
var path = require('path')

var databaseComponent = require(path.resolve(__dirname + '/database.js'))
require('http-shutdown').extend();
var webServer

const session = require('express-session');
const MongoStore = require('connect-mongo')(session);


module.exports = function (productInfo, database) {
    
    var app = express();
    app.enable('strict routing');
    app.set('trust proxy', true)
    app.set('case sensitive routing', true);

    app.set('port', process.env.PORT || 8000);
    app.set('views', path.resolve(path.dirname(require.main.filename) + `/app/server/views/`))
    

    app.set('view engine', 'pug')
    
    app.set('productName', productInfo.name);
	app.set('productCodename', productInfo.codename);
	app.set('productVersion', productInfo.version);
    app.use(helmet({
        hsts: false
    }));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(expurl({
        requestType: 'GET',
        redirectStatusCode: 301,
        lowercase: false,
        trailingSlash: true,
        repeatedSlash: true,
        repeatedQuestionMark: true,
        repeatedAmpersand: true
    }));
    app.use(helmet.hidePoweredBy({ setTo: `QLS ${app.get('productName')} (${app.get('productCodename')} v.${app.get('productVersion')}) ` }))
    app.use(expressSanitizer());

    
    
    this.start = function() {
        function openBrowser(proto,address) {
            if (!process.env.ADMIN && process.env.FIRST_WORKER && process.env.NODE_ENV != "production" && !process.env.NO_BROWSER_OPEN) {
                stringBuilder = proto+'://'+address.address+":"+address.port
                console.log('Server available at: ' + stringBuilder)
                open(stringBuilder)
            }
        }
        
        var sessionMiddleware = session({
            cookie: {		
                sameSite: 'strict',
                maxAge: 43200 * 60 * 1000,   // 1 hour x 6
                secure: process.env.secureCookie || false, 
                httpOnly: true
            },
            secret: process.env.COOKIE_SESSION_SECRET || "3e9cd8c4dc45887c9c8b1cf25f452e0964b8ed34aab594a91271e25eed6c593a4d5a8ff375e445729e8cc2321bd20166b10d9a1fdfd825b2b8642bfd70a6cafb",
            saveUninitialized: true,
            rolling: true,
            resave: false,
            proxy: true,
            name: process.env.COOKIE_NAME || 'covidence',
            store: new MongoStore({
                client: databaseComponent.getDb('clientOnly'),
                dbName: "covidence",
                touchAfter: 24 * 3600, // time period in seconds
                secret: process.env.SESSION_ENC_SECRET || "a8eade4be42bd79d609c94a9ae287683350e062fc4161f067a2dc4ee68cdc1025e7bb4a0a7cf6745e9fae2f5110b09d2cf4dc006c2cf1d13bdacd54561b856f4",
            })
        });
        let ip = process.env.IP || '127.0.0.1'
        if (process.env.HEROKU == "true") {
            app.listen(app.get('port'), function() {
                console.log('Our app is running on http://localhost:' + app.get('port'));
            });
        }
        else if (!process.env.HTTPS_ENABLED || process.env.HTTPS_ENABLED != "true") {
            var http = require('http')
            webServer = http.createServer(app).listen(app.get('port'), ip, function() {
                openBrowser('http', webServer.address())
            }).withShutdown();
        }
        else {  
            var credentials = {
                key: fs.readFileSync('certs/server.key', 'utf8'), 
                cert: fs.readFileSync('certs/server.crt', 'utf8'),
                ca: [fs.readFileSync('certs/ca.crt', 'utf8')], //client auth ca OR cert
                requestCert: true,                   //new
                rejectUnauthorized: false            //new
            };
            var https = require('https')
            webServer = https.createServer(credentials, app).listen(app.get('port'), ip, function() {
                openBrowser('https', webServer.address())
            }).withShutdown();
        }
        
        console.log(`Server running on port ${app.get('port')}`)
        require(path.resolve(path.dirname(require.main.filename) + '/app/server/routes.js'))(app, sessionMiddleware);
        //var io = require('socket.io')(webServer);
        //io.use(function (socket, next) {
        //    sessionMiddleware(socket.request, socket.request.res, next);
        //    });
        //require(path.resolve(__dirname + '/app/server/socket.js'))(io);

        
    }
    this.stop = function (callback) {
        webServer.shutdown(function(err) {
            if (err) {
                if (callback) {
                    callback(err)
                }
                else{
                    return console.log('shutdown failed', err.message);
                }
            }
            else {
                console.log('Web-server is cleanly shutdown.');
                if (callback) {
                    callback(null)
                }
                else {
                    process.exit(0)
                }
            }
            
        });
    }

    this.serverInstance = webServer;
}