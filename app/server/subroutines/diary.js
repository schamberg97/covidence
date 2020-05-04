var diaryRecords

var fs = require('fs')
var path = require('path')
var commonRouterFunctions = require(path.resolve(path.dirname(require.main.filename) + '/app/server/modules/commonRouterFunctions.js'))
var moment = require('moment')

var getObjectId = function(id)
{
	return new require('mongodb').ObjectID(id);
}

module.exports = function (app, database) {
    diaryRecords = database.getDb().collection('records')

    app.get('/diary/find-records/all/', (req,res) => {
        if (!req.session.user) {
            commonRouterFunctions.authRequired(req,res)
        }
        diaryRecords.find({userID: req.session.user._id}).toArray(function(e, o) {
            if (e || o == null) {
                let status = 404
                if (e) status = 500
                res.status(status).json({code:status,status:'error',error:e||"nothing-found"})
            }
            else {
                if (!req.body.email) {
                    res.status(200).json({code:200,status:'ok',data:o})
                }
                else {
                    formHtmlEmail(req,res, o)
                }
            }
        });
        
    })

    app.get('/diary/find-records/single/:id/', (req,res) => {
        if (!req.session.user) {
            commonRouterFunctions.authRequired(req,res)
        }
        diaryRecords.findOne({_id:getObjectId(req.params.id), userID: req.session.user._id}, function(e,o) {
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

    app.post('/diary/delete-record/:id/', (req,res) => {
        if (!req.session.user) {
            commonRouterFunctions.authRequired(req,res)
        }
        else {
            diaryRecords.deleteOne({_id:getObjectId(req.params.id), userID: req.session.user._id}, function(e, obj){
				if (!e){
					res.status(200).json({code:200, status:'ok'});
                }	
                else{
					res.status(400).json({code:400, status:'error', error: 'record-not-found'});
                }
            });
        }
    })

    app.post('/diary/make-record/', (req,res) => {
        if (!req.session.user) {
            commonRouterFunctions.authRequired(req,res)
        }
        else if (req.body.recordData === Object(req.body.recordData)){
            let dateCreation = moment().unix()
            req.body.recordData.dateCreation = dateCreation
            req.body.recordData.userID = req.session.user._id
            diaryRecords.insertOne(req.body.recordData, function(e,o) {
                if (e) {
                    res.status(500).json({code:500, status:'error', error: 'server-error'});
                }
                else {
                    let obj = {
                        id: o.ops[0]._id,
                        dateCreation
                    }
                    res.status(200).json({code:200, status:'ok', data: obj});
                }
            });
        }
        else {
            res.status(400).json({code:400, status:'error', error: 'bad-request'});
        }
    })

    app.post('/diary/find-records/update/:id/', (req,res) => {
        if (!req.session.user) {
            commonRouterFunctions.authRequired(req,res)
        }
        else if (req.body.recordData === Object(req.body.recordData)) {
            let dateModification = moment().unix()
            req.body.recordData.dateModification = dateModification
            diaryRecords.findOne({ _id: getObjectId(req.params.id), userID: req.session.user._id }, function (e, orig) {
                if (e || o == null) {
                    let status = 404
                    if (e) status = 500
                    res.status(status).json({ code: status, status: 'error', error: e || "nothing-found" })
                }
                else {
                    diaryRecords.findOneAndUpdate({ _id: getObjectId(req.params.id) }, { $set: o }, { returnOriginal: false }, function (e,o) {
                        if (e || o == null) {
                            let status = 500
                            res.status(status).json({ code: status, status: 'error', error: e || "server-error" })
                        }
                        else {
                            let obj = {
                                id: orig._id,
                                dataCreation: orig.dateCreation,
                                dateModification
                            }
                            res.status(200).json({code:200, status:'ok', data: obj});
                        }
                    });
                }
            })

        }

    })

}

function formHtmlEmail(req,res,data) {
    console.log(data)
}