var path = require('path')

var databaseComponent = require(path.resolve(path.dirname(require.main.filename) + '/database.js'))
var commonRouterFunctions = require(path.resolve(path.dirname(require.main.filename) + '/app/server/modules/commonRouterFunctions.js'))

module.exports = function (app, sessionMiddleware) {

    require(path.resolve(__dirname + '/subroutines/auth.js'))(app, sessionMiddleware)
    
    app.all('*', (req,res) => {
        
        if (req.session.user) {
            res.json({code:200,status:'authorized'})
        }
        else {
            res.json({code:200,status:"works-unauthorized"})
        }
		
	})
}