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
        if (!req.session.user) {
            commonRouterFunctions.authRequired(req,res)
        }
        else {
            if (req.body.answers && Array.isArray(req.body.answers) && req.body.answers.length ){
                let questionsFilePath = path.resolve(path.dirname(require.main.filename) + '/data/questions.json')
                fs.readFile(questionsFilePath, (err,qData) => {
                    if (err || !qData) {
                        console.log(err)
                        res.status(500).json({
                            code:500,
                            status:'error',
                            error:'server-error'
                        })
                    }
                    else {
                        qData = JSON.parse(qData)
                        var numPointsInit = qData.questions.map(function (currentValue, index, array) { 
                            return currentValue.weight
                        }).reduce(function(sum, elem){
                            return sum + elem; //получаем сумму весов
                        })
                        var numPointsDed = 0
                        // общее число очков

                        req.body.answers.forEach((item, index) => {
                            
                            let question = qData.questions.find(x => x.code === item.code)

                            let questionWeight = question.weight
                            let questionCost = question.answers.find(x => x.value === item.value).cost * questionWeight
                            numPointsDed = numPointsDed + questionCost

                            if (index === req.body.answers.length - 1) {
                                goOn(numPointsInit, numPointsDed)
                            }

                        })

                    }
                })
            }
            else {
                res.status(400).json({code:400,status:'error',error:'bad-data'})
            }
        }
        function goOn(pointsMax, points) {
            //y=4.0000x2+−3.6000x+2.4000
            var probability = 4 * Math.pow(points, 2) - (3.6*points) + 2.4
            res.json({code:200,status:'ok', data: {
                probability
            }})
        }
    })


}