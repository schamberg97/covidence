var path = require('path')

var databaseComponent = require(path.resolve(path.dirname(require.main.filename) + '/database.js'))
var commonRouterFunctions = require(path.resolve(path.dirname(require.main.filename) + '/app/server/modules/commonRouterFunctions.js'))



module.exports = function (app, sessionMiddleware) {

    

    require(path.resolve(__dirname + '/subroutines/auth.js'))(app, sessionMiddleware)

    require(path.resolve(__dirname + '/subroutines/questionaire.js'))(app)

    require(path.resolve(__dirname + '/subroutines/news.js'))(app)
    
    app.all('*', (req,res) => {
        
        if (req.session.user) {
            let data = req.session.user
            let expiry = new Date(req.session.cookie._expires)
            let validUntil = expiry.getTime()
            res.json({code:200,status:'authorized', data, session: {validUntil}})
        }
        else {
            res.json({code:200,status:"works-unauthorized"})
        }
		
	})
}