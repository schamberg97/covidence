var path = require('path')
var databaseComponent = require(path.resolve(path.dirname(require.main.filename) + '/database.js'))
var fs = require('fs')

var UAM = require(path.resolve(path.dirname(require.main.filename) + '/app/server/modules/userAccountManager.js'))
UAM.init(databaseComponent.getDb())
var emailManager = require(path.resolve(__dirname+'/../modules/emailDispatcher.js'))
emailManager.init()
var commonRouterFunctions = require(path.resolve(path.dirname(require.main.filename) + '/app/server/modules/commonRouterFunctions.js'))
var simpleMathOps = require(path.resolve(path.dirname(require.main.filename)+ '/simpleMathOps.js'))

var cluster = require('cluster')

var rateLimiterPoints = 200
if (cluster.isWorker) {
    var { RateLimiterCluster, RateLimiterMongo } = require('rate-limiter-flexible');
    var rateLimiterMemoryDynamic = new RateLimiterCluster({
        keyPrefix: 'rl0',
    	points: rateLimiterPoints, 
    	duration: 1,
        blockDuration: 60,
        execEvenly: true
    });
}
else {
    var { RateLimiterMemory, RateLimiterMongo } = require('rate-limiter-flexible');
    var rateLimiterMemoryDynamic = new RateLimiterMemory({
        keyPrefix: 'rl0',
    	points: rateLimiterPoints, 
    	duration: 1,
        blockDuration: 60,
        execEvenly: true
    });
}
const rateLimiterDynamic = new RateLimiterMongo({
    //points: 20,
    //duration: 1,
    //blockDuration: 60,
    execEvenly: true,
    points: rateLimiterPoints,
    duration: 1,
	blockDuration: 15,
    storeClient: databaseComponent.getDb('clientOnly'),
    dbName: process.env.MONGODB_DB_NAME,
	tableName: 'users-rate-limit-dynamic',
	keyPrefix: 'rl0',
	inmemoryBlockOnConsumed: 250,
	inmemoryBlockDuration: 60,
	insuranceLimiter: rateLimiterMemoryDynamic
});


module.exports = function (app,sessionMiddleware) {


	app.use(sessionMiddleware)

	app.all('*', function (req, res, next) {
        console.log(req.body)
		var ip = req.ip.split(':')[0]
		
		if (req.body['apiType'] == "mobile" || req.query.apiType == "mobile") {
			console.log('got here :)')
			// Проверка, что в body есть параметр deviceType, равный 'mobile'
			
			//res.clearCookie('roedl.sid', { path: '/' })
    		var accessToken = req.body['accessToken'] || req.query.accessToken // Проверка accessToken
    		if (accessToken) {
    			
    		    req.sessionID = accessToken;
    		    req.sessionStore.get(accessToken, function (err, ses) {
    		        // This attaches the session to the req.
    		        if (!err && ses) {
    		        	//console.log(ses)
    		        	if (ses.secretAccessToken == req.body['secretAccessToken'] || ses.secretAccessToken == req.query.secretAccessToken) {
    		        		req.sessionStore.createSession(req, ses);
    		        		res.clearCookie(process.env.COOKIE_NAME || 'covidence');
    		        		next()
    		        	}
    		        	else {
    		        		
    		        		var resObj = {
								code: 401,
								status: "error",
								error: "invalid-tokens"
							}
							
							res.status(resObj.code).send(resObj)
    		        	}
    		        }
    		        else {
    		        	
    		        	var resObj = {
							code: 401,
							status: "error",
							error: "invalid-tokens"
						}
						res.status(resObj.code).send(resObj)
    		        }
    		    })
    		} else {
    		    next()
    		}
    	}
    	else {
    		next()
    	}
	})

    app.all('*', (req, res, next) => {
        let key = req.ip;
        let pointsToConsume = 20
        if (req.session.user) {
            //key = req.session.user.user
            pointsToConsume = 1;
        }
        rateLimiterDynamic.consume(key, pointsToConsume)
            .then((rateLimiterRes) => {
                next()
            })
            .catch((rej) => {
                let obj = {
                    req,res,next
                }
                if (rej.consumedPoints < rateLimiterPoints + 5) {
                    req.setTimeout(rej.msBeforeNext + 10000);
                    setTimeout(continueDoing, rej.msBeforeNext)
                    function continueDoing() {
                        rateLimiterDynamic.consume(key, pointsToConsume)
                        next()
                    }

                }
                else {
                    let response = {
                        code: 429,
                        status: "too-many-requests",
                        retryIn: rej.msBeforeNext //milliseconds
                    }
                    res.status(429).json(response)
                }
            });
    })

    app.get('/user/info/', function(req,res) {
		if (req.session.user == null) {
			var resObj = {
				code: 401,
				status: "error",
				error: "unauthorized"
			}
			res.status(resObj.code).send(resObj)
		}
		else {
            let f = req.session.user;
            let expiry = new Date(req.session.cookie._expires)
            console.log(expiry)
			var resObj = {
				code: 200,
                status: "ok",
                session: {
                    validUntil: expiry.getTime()
                },
				data: sessionDataSanitizer(f)
			}
			
			res.status(resObj.code).send(resObj)
		}
	})

    app.post('/user/delete/', function(req, res){
		if (req.session.user) {
			AM.profile.deleteAccount(req.session.user._id, function(e, obj){
				if (!e){
					res.clearCookie('login');
					req.session.destroy(function(e){ 
						res.status(200).json({code:200, status:'ok'});
					});
				}	else{
					res.status(400).json({code:400, status:'error', error: 'record-not-found'});
				}
			});
		}
		else {
			commonRouterFunctions.authRequired(req,res)
		}
	});

    app.post('/user/profile/', (req,res) => {
        if (!req.session.user) {
            commonRouterFunctions.authRequired(req,res)
        }
        else {
            UAM.profile.updateAccount({
				id		: req.session.user._id,
                firstname	: req.body['firstname'] || req.session.firstname,
                middlename	: req.body['middlename'] || req.session.middlename,
                lastname : req.body['lastname'] || req.session.lastname,
                email	: req.body['email'],
                oldPass : req.body['oldPass'],
				pass	: req.body['pass'],
                gender	: req.body['gender'] || req.session.gender,
                bday: req.body['bday'] || req.session.bday,
                address: req.body['address'] || req.session.address,
                phone: req.body['phone'] || req.session.phone,
                docType: req.body['docType'] || req.session.docType, // тип документа, удостоверяющего личность 
                docNum: req.body['docNum'] || req.session.docNum, // серия и номер документа, удостоверяющего личность
                taxNumber : req.body['taxNumber'] || req.session.taxNumber, //12 digits, ИНН
                snilsNumber: req.body['snilsNumber'] || req.session.snilsNumber,
                insPolicy: req.body['insPolicy'] || req.session.insPolicy,
                insPolicyNum: req.body['insPolicyNum'] || req.session.insPolicyNum,

                //id: i._id,
                //user: i.user,
                //email: i.email,
                //bday: i.bday,
                //firstname: i.firstname,
                //middlename: i.middlename,
                //lastname: i.lastname,
                //userActivated: i.userActivated,
                //address: i.address,
                //covidLikelihood: i.covidLikelihood,
                //taxNumber: i.taxNumber,
                //snilsNumber: i.snilsNumber,
                //docType: i.docType,
                //docNum: i.docNum,
                //phone: i.phone,
                //insPolicy: i.insPolicy,
                //insPolicyNum: i.insPolicyNum

			}, function(e, o){
                var resObj;
				if (e){
					res.status(e.code).send(e);
				}	else{
					req.session.user = o.value;
					res.status(200).send({code:200, status:'ok'});
				}
			});
        }
    })
    
	app.post('/user/login/', function (req, res) {
        doJob({})
        function doJob(loginSettings) {
            var p0 = new Promise(
                function (resolve, reject) {
                    UAM.auth.tryLogin(req.body['user'], req.body['pass'], function (e, o) {
                        if (!o) {
                            var resObj = {
                                code: 401,
                                status: "error",
                                error: e || "error"
                            }
                            resolve(resObj)
                        }
                        else {
                            req.session.user = o;
                            if (req.body['apiType'] === "web") {
                                if (req.body['remember-me'] == 'false') {
                                    var resObj = {
                                        code: 200,
                                        status: "logged-in"
                                    }
                                    if (loginSettings.goTo) {
                                        if (req.session.accountRoles.includes('admin') && loginSettings.goToAdmin) {
                                            resObj.goTo = loginSettings.goToAdmin
                                        }
                                        else {
                                            resObj.goTo = loginSettings.goTo
                                        }
                                    }
                                    resolve(resObj)

                                }
                                else {
                                    UAM.auth.generateLoginKey(o.user, req.ip, function (key) {
                                        res.cookie('login', key, { maxAge: 900000 });
                                        var resObj = {
                                            code: 200,
                                            status: "logged-in-and-remembered"
                                        }
                                        if (loginSettings.goTo) {
                                            if (req.session.accountRoles.includes('admin') && loginSettings.goToAdmin) {
                                                resObj.goTo = loginSettings.goToAdmin
                                            }
                                            else {
                                                resObj.goTo = loginSettings.goTo
                                            }
                                        }
                                        resolve(resObj)
                                    });
                                }
                            }
                            if (req.body['apiType'] === "mobile") {
                                req.session.secretAccessToken = simpleMathOps.guid()
                                req.session.user.lastUpdate = parseInt((new Date().getTime() / 1000).toFixed(0))
                                var expiry = new Date(req.session.cookie._expires)


                                var resObj = {
                                    code: 200,
                                    status: "logged-in",
                                    accessToken: req.session.id,
                                    secretAccessToken: req.session.secretAccessToken,
                                    validUntil: expiry.getTime(),
                                }
                                resolve(resObj)
                            }

                        }
                    });
                }
            );

            p0
                .then(function (result) {
                    res.status(result.code).json(result)
                })

        }
    });


    app.post('/user/signup/', function(req, res){
		if (req.session.user) {
			var resObj = {
				code: 400,
				status: "error",
				error: "already-authorized"
			}
			res.status(resObj.code).json(resObj)
		}
		else {
			req.body.user = req.body.user.toLowerCase().replace(/ /g, '')
			req.body.email = req.body.email.toLowerCase().replace(/ /g, '')
			var p0 = new Promise(
    			function (resolve, reject) {
    				if (req.body['email'] && req.body['user'] && req.body['pass'] && req.body['firstname'] && req.body['lastname']) {
						if (req.body['userAgreement'] == 'true') {
							
							var email = req.body['email'];
							email = email.toLowerCase();
							if (UAM.usefulFunctions.validateEmail(email)) {
								if (req.body['middlename']) {
									var middlename = req.body['middlename']
								}
								else {
									var middlename = "";
								}
								
								
								//var dateOfBirthday = req.body['dateOfBirthday']
								//dateOfBirthday = dateParser(dateOfBirthday)
								
								UAM.profile.createAccount({
                                    gender  : req.body.gender,
									email 	: email,
									user 	: req.body['user'].toLowerCase(),
									pass	: req.body.pass,
									firstname	: req.body['firstname'],
									middlename	: middlename,
                                    lastname	: req.body['lastname'],
                                    phone       : req.body['phone']
								}, function(e, o){
									if (e || o==null){
										var resObj = {
											code: 400,
											status: "error",
											error: e || "could-not-register"
										}
										reject(resObj)
									}	else{
										var resObj = {
											code: 200,
											status: "ok"
										}
										resolve(resObj)
									}
								});
							}
							else {
								var resObj = {
									code: 400,
									status: "error",
									error: "wrong-email"
								}
								reject(resObj)
							}
						}
						else {
							var resObj = {
								code: 403,
								status: "no-consent"
							}
							reject(resObj)
						}
					}
					else {
						var resObj = {
							code: 403,
							status: "data-missing"
						}
						reject(resObj)
					}
				}
			)
			
			p0
				.then(function (result) {
					console.log(result)
        		    res.status(result.code).json(result)
        		})
        		.catch(function (error) {
        			console.log(error)
        		    res.status(error.code).json(error)
        		});
		}
	});

    app.post('/user/signup/resend/', function (req, res) {
        if (req.session.user) {
            commonRouterFunctions.onlyForUnauthorized(req,res)
        }
        else {
			let email = req.body['email'];
			email = email.toLowerCase();
			var p0 = new Promise(function (resolve) {
				UAM.auth.checkAccount(email, null, function(e, o){
					if (e || o == null) {
						var resObj = {
							code: 400,
							status:"error",
							error: e || "no-account"
						}
						resolve(resObj)
					}
					else if (o.userActivated){
						var resObj = {
							code: 400,
							status:"error",
							error: "already-activated"
						}
						resolve(resObj)
					}
					else if (o.emailResendAttempts == 5) {
						var resObj = {
							code: 400,
							status:"error",
							error: "too-many-attempts"
						}
						resolve(resObj)
					}
					else {
						UAM.profile.resendEmail(email, function(e,o){
							if (e || o == null) {
								var resObj = {
									code: 400,
									status:"error",
									error: e || "error"
								}
								resolve(resObj)
							}
							else {
								var attemptsLeft = 5 - o.value.emailResendAttempts;
								attemptsLeft = attemptsLeft.toString();
								var resObj = {
									code: 200,
									status:"ok",
									attemptsLeft: attemptsLeft
								}
								resolve(resObj)
								//res.status(200).send(attemptsLeft);
							}
						
						})
						//res.status(200).send('ok');
					}
				
				})
			})
			p0.then(function(result) {
                console.log(result)
				res.status(result.code).json(result)
			})
		}

    });
    
	app.get('/user/signup/confirm/', function(req, res) {
		if (req.session.user){
			commonRouterFunctions.onlyForUnauthorized(req,res)
		}
		else {
			if (req.query['email'] && (req.query['regKey'] || req.query['regkey']) ) {
				let email = req.query['email'];
				email = email.toLowerCase();
                let regKey = req.query['regKey'] || req.query['regkey'];
                
				if (regKey.length != 6) {
					res.status(403).json({code:403,status:'error',error:'wrong-key-format'})
                }
                //regKey = parseInt(regKey)
				if (UAM.usefulFunctions.validateEmail(email) == false) {
					res.status(403).json({code:403,status:'error',error:'wrong-email-format'})
				}
				else {
					UAM.profile.validateRegistrationKey(email, regKey, function(e, o){
						if (e || o == null){
							console.log(o);
							console.log(e);
							res.status(403).json({code:403,status:'error',error:'error'})
						} else{
                            
							UAM.profile.activateAccount(email, function(e, o){
								if (o){
									res.json({code:200, status:'ok'})
									
								}	else{
                                    res.status(401).json({code:401,status:'error',error:'no-account'})
								}
							})
						}
					})
				}
            }
            else {
                res.status(403).json({code:403,status:'error',error:'error'})
            }
		}
	});

	app.post(['/user/logout', '/user/logout/'], function(req, res){
        res.clearCookie('login');
        var cookieName = process.env.COOKIE_NAME || 'covidence'
		res.clearCookie(cookieName);
		req.session.destroy(function(e) {
            var resObj
            if (!e) {
                resObj = {
                    code: 200,
                    status: "ok"
                }
            } 
            else {
                resObj = {
                    code: 500,
                    status: "error"
                }
            }
			res.status(resObj.code).json(resObj); 
		});
    })
    
    
    app.post('/user/lost-password/', function(req, res){
		if (req.session.user){
			commonRouterFunctions.onlyForUnauthorized(req,res)
		}
		else {
            let resObj
			let email = req.body['email'];
			email = email.toLowerCase();
			if (UAM.usefulFunctions.validateEmail(email) == true) {
				UAM.profile.generatePasswordKey(email, function(e, account){
					if (e){
                        resObj = {
                            code: 400,
                            status: "error",
                            error: e || "error"
                        }
                        res.status(resObj.code).json(resObj)
					}	else{
						emailManager.profile.dispatchResetPasswordLink(account, function(e, m){
					// TODO this callback takes a moment to return, add a loader to give user feedback //
							if (m){
                                resObj = {
                                    code: 200,
                                    status: "ok"
                                }
								res.status(resObj.code).json(resObj)
							}	else{
								//for (k in e) console.log('ERROR : ', k, e[k]);
                                console.log(e)
                                resObj = {
                                    code: 400,
                                    status: "error",
                                    error: "could-not-reset-pass"
                                }
                                res.status(resObj.code).json(resObj)
                            }
                            
						});
					}
				});
			}
			else {
                resObj = {
                    code: 400,
                    status: "error",
                    error: "wrong-email"
                }
                res.status(resObj.code).json(resObj)
            }
            
		}
    });
    
    app.post('/user/reset-password/', function(req, res) {
		let newPass = req.body['pass'];
        let passKey = req.body['key']
        let email = req.body['email']
	// destroy the session immediately after retrieving the stored passkey //
		req.session.destroy();
		UAM.profile.updatePassword(passKey, newPass, email, function(e, o){
			if (o){
				res.status(200).json({code:200, status:'ok'});
			}	else{
				res.status(400).json({code:400, status:'error', error: e || 'error'});
			}
		})
	});

}




function sessionDataSanitizer(i) {
	var g = {
		id: i._id,
		user: i.user,
		email: i.email,
		bday: i.bday,
		firstname: i.firstname,
		middlename: i.middlename,
		lastname: i.lastname,
        userActivated: i.userActivated,
        address: i.address,
        covidLikelihood: i.covidLikelihood,
        taxNumber: i.taxNumber,
        snilsNumber: i.snilsNumber,
        docType: i.docType,
        docNum: i.docNum,
        phone: i.phone,
        insPolicy: i.insPolicy,
        insPolicyNum: i.insPolicyNum
	}
	
	return g;
}