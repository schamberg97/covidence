var path = require('path')

var databaseComponent = require(path.resolve(path.dirname(require.main.filename) + '/database.js'))
var commonRouterFunctions = require(path.resolve(path.dirname(require.main.filename) + '/app/server/modules/commonRouterFunctions.js'))



module.exports = function (app, sessionMiddleware) {

    

    require(path.resolve(__dirname + '/subroutines/auth.js'))(app, sessionMiddleware)

    require(path.resolve(__dirname + '/subroutines/questionaire.js'))(app)

    require(path.resolve(__dirname + '/subroutines/news.js'))(app)

    require(path.resolve(__dirname + '/subroutines/diary.js'))(app, databaseComponent)
    
    app.all('*', (req,res) => {
        
        res.json({
            code: 200,
            status: "ok",
            data: {
                name: app.get('productName'),
                codename: app.get('productCodename'),
                version: app.get('productVersion')
            }
        })
		
	})
}