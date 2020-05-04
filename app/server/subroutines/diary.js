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
                if (!req.query.email) {
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
        else {
            let dateCreation = moment().unix()
            var obj
            obj = JSON.parse(JSON.stringify(req.body))
            obj.dateCreation = dateCreation
            obj.userID = req.session.user._id
            delete obj.accessToken
            delete obj.secretAccessToken
            diaryRecords.insertOne(obj, function(e,o) {
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
        //else {
        //    res.status(400).json({code:400, status:'error', error: 'bad-request'});
        //}
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
    // Google удалили нужные методы в андроид, поэтому пока заглуха
    var content = "No-Covid Diary <br> <br>"
    var recordText
    for (let n = 0; n<data.length; n++) {
        let recordDate = moment.unix(data[n].dateCreation)
        recordText = recordText + `Дата записи: ${recordDate.format("DD.MM.YYYY, HH:mm")} <br>`
        recordText = recordText + `Описание самочувствия: ${data[n].text} <br> Оценка возможности наличия COVID-19: ${data[n].covidLikelihood || "Недоступно"}`
        recordText = recordText + `<br> <br>`
    }
    res.status(200).json({
        code:200,
        status:'ok',
        text:recordText
    })
}

function formHtmlEmailOld(req,res,data) {
    var header = `<div class="mx-auto"><img class="mx-auto" src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAArIAAAGXCAMAAAB4LkOqAAABblBMVEX////j0/zf
    zfy/m/m4kPmgavfbx/zX8+7R8uyj5diY4tR12MbL8Onv5v7PtPu0ifmYXvaAOPSU
    V/awg/nLrvrr4P3o+PW66+KS4dJq1cFHy7Jk076M38+06d/i9/Pn2v2sffiMS/WI
    RfWod/jXwfvc9fCH3c1Y0LlTzreB3MrF7uekcPf7+f972sj5/f3DofmQUfao5tpe
    0rzHqPqu6N2EPvRNzbS8lvqe5NfTuvv38/6/7eTz/PqcZPdv18Pz7P7u+vjK0vBl
    fdRJx7R3T+pTq8F8QfBZnsd5SutQtLxyXeRLwrZneNd+PPJekM57Ru51U+dOubts
    a91ihtJrb9tpc9huZd90WOVgi89kgtNwYeFbmMlXosVMvbhclMtSsL/w5/3n2vze
    y/zs4f3Gpfqg5Nes59zP8evW8+7p+Pa9mfnI7+j0/PqS4NH7+f7v+vjd9fDNsPr0
    7v7Zw/u26uDj9/O0ifj5/fxVpsOFrtfvIP2uAAAVh0lEQVR4AezYRXrrQBBF4RJL
    5jK7zMwY48Pg/pcUZo6x6Z+2hvc7khoEpum6bhiGab3HvD6xdV0HsTiu63qe5/O/
    x3d9Erh+AJiiBPWQEbYi+H1RK2bE9QTwK+mmvLQ/Q9+X9ee8vFsA5ZCKtlGyyri+
    ilU1ahrwpB7wGv4mra/lb3sdB5Q900NGN4rbErWMuN4Dxrkpr5+lbcn6vbw7AGUP
    9GEpirswKg11YJM7bmRpFyaNsQu7o+hHsQjuViQcLwJL3GkuQ7uVSefrsHWKZli4
    J7PuUAMWOJ6f9mTeHzuwNUpx2J3hHWlmWx/353SHr9kqwXi1gocx6x4l4BCS+XaL
    DmPenxZgfUpxEcHDipr6vvO6zNBhZX0urEHp1cJlZEEltvoF+zHopJvEglbu9x/4
    CaUXqs6QId347lc7SLXnxJB+/turVWqlGTKnuurBDnUac2JO+/cAvqRo4TKyaRaz
    YTecdJPYNM8F4DNKwhghy8rhImxbwZsQy5rpOnxAWXWRfdHtftb+7hP7su991irB
    RRn5MIttK7XJZZP4MM/xl1oV2Of+hnpSBPa5f6kB3FP+L8rIm0o4CJs4XjaJN610
    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'></div>`
   
    // монструозная жесть а-ля base64

    var generatedContent
    var recordText = `<hr class="margin">`
    for (let n = 0; n<data.length; n++) {
        let recordDate = moment.unix(data[n].dateCreation)
        recordText = recordText + `<div class="mx-auto"><h2>Дата записи: ${recordDate.format("DD.MM.YYYY, HH:mm")}</h2>`
        recordText = recordText + `<table><tr><th>Описание самочувствия</th><th>Оценка возможности наличия COVID-19, %</th></tr>`
        recordText = recordText + `<tr><td>${data[n].text}</td><td>${data[n].covidLikelihood || '<i>Недоступно</i>'}</td></tr></table></div><hr class="margin">`
    }
    var html = '<html><head><style>hr{max-width:50%} img{height:203px;width:345px;display:block} .margin{margin-top: 2rem} .margin-big{margin-top: 4rem} .mx-auto{margin-left: auto!important; margin-right: auto!important} h2{text-align: center; margin-left: auto!important; margin-right: auto!important} table{margin-left: auto!important; margin-right: auto!important; font-family: arial, sans-serif;border-collapse: collapse;min-width: 50%; max-width:75%} td, th {  border: 1px solid #dddddd;  text-align: center;  padding: 8px;}tr:nth-child(even) {  background-color: #dddddd;}</style></head><body>' + header + recordText + '</body></html>'
    res.status(200).json({
        code:200,
        status:'ok',
        html
    })
}