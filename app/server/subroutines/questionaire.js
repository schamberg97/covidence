var fs = require('fs')
var path = require('path')
var commonRouterFunctions = require(path.resolve(path.dirname(require.main.filename) + '/app/server/modules/commonRouterFunctions.js'))

module.exports = function (app, sessionMiddleware) {

    app.get('/bot/questions/', (req, res) => {
        let questionsFilePath = path.resolve(path.dirname(require.main.filename) + '/data/questions.json')
        fs.readFile(questionsFilePath, (err, data) => {
            if (err || !data) {
                console.log(err)
                res.status(500).json({
                    code: 500,
                    status: 'error',
                    error: 'server-error'
                })
            }
            else {
                data = JSON.parse(data)
                res.status(200).json({ code: 200, status: 'ok', data })
            }
        })
    })

    app.post('/bot/answers/', (req, res) => {

        if (req.body.answers && Array.isArray(req.body.answers) && req.body.answers.length) {
            let questionsFilePath = path.resolve(path.dirname(require.main.filename) + '/data/questions.json')
            fs.readFile(questionsFilePath, (err, qData) => {
                if (err || !qData) {
                    console.log(err)
                    res.status(500).json({
                        code: 500,
                        status: 'error',
                        error: 'server-error'
                    })
                }
                else {
                    qData = JSON.parse(qData)
                    var numPointsInit = qData.questions.map(function (currentValue, index, array) {
                        return currentValue.weight
                    }).reduce(function (sum, elem) {
                        return sum + elem; //получаем сумму весов
                    })
                    var numPointsDed = 0
                    // общее число очков
                    var numPointsChosenInit = 0
                    req.body.answers.forEach((item, index) => {

                        let question = qData.questions.find(x => x.code === item.code)

                        let questionWeight = question.weight
                        let questionCost = question.answers.find(x => x.value === item.value).cost * questionWeight
                        numPointsChosenInit = numPointsChosenInit + questionWeight
                        numPointsDed = numPointsDed + questionCost

                        if (index === req.body.answers.length - 1) {
                            goOn(numPointsInit,numPointsChosenInit, numPointsDed)
                        }

                    })

                }
            })
        }
        else {
            res.status(400).json({ code: 400, status: 'error', error: 'bad-data' })
        }
        function goOn(pointsMax, pointsMaxChosen, points) {
            //Y=0,005892857--0,000339286x+0,0302678571428571x^2
            console.log(pointsMax)
            console.log(pointsMaxChosen)
            console.log(points)
            points = (points / pointsMaxChosen * pointsMax)
            console.log(points)
            var probability = 0.035892857 - 0.000339286* points + 0.0302678571428571*Math.pow(points,2)
            //probability = probability * 100
            //4 * Math.pow(points, 2) - (3.6 * points) + 2.4
            if (probability > 95) {
                probability = 95
            }
            res.json({
                code: 200, status: 'ok', data: {
                    probability
                }
            })
        }
    })


}