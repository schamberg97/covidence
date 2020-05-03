var fs = require('fs')
var path = require('path')
var commonRouterFunctions = require(path.resolve(path.dirname(require.main.filename) + '/app/server/modules/commonRouterFunctions.js'))

module.exports = function (app,sessionMiddleware) {

    app.get('/bot/questions/', (req,res) => {
        if (!req.session.user) {
            commonRouterFunctions.authRequired(req,res)
        }
        else {
            let questionsFilePath = path.resolve(path.dirname(require.main.filename) + '/data/questions.json')
            fs.readFile(questionsFilePath, (err,data) => {
                if (err || !data) {
                    console.log(err)
                    res.status(500).json({
                        code:500,
                        status:'error',
                        error:'server-error'
                    })
                }
                else {
                    data = JSON.parse(data)
                    res.status(200).json({code:200, status: 'ok', data})
                }
            })
        }
    })

    app.post('/bot/answers/', (req,res) => {

    })


}