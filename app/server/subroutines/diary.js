var diaryRecords

var fs = require('fs')
var path = require('path')
var commonRouterFunctions = require(path.resolve(path.dirname(require.main.filename) + '/app/server/modules/commonRouterFunctions.js'))


module.exports = function (app, database) {
    diaryRecords = database.getDb().collection('records')

    app.get('/diary/find-records/single/:id/', (req,res) => {
        if (!req.session.user) {
            commonRouterFunctions.authRequired(req,res)
        }
        diaryRecords.findOne({recordID:req.params.id, userID: req.session.user._id}, function(e,o) {
            if(e || o==null) {
                let status = 404
                if (e) status = 500
                res.status(status).json({code:status,status:'error',error:e||"nothing-found"})
            }
            else {
                res.status(200).json({code:200,status:'ok',data:o})
            }
        })

    })

}