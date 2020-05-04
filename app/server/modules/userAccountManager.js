var fs = require('fs');
const crypto = require('crypto');

var accounts;
var accountsUpdateLogs;
var path=require('path')
var simpleMathOps = require(path.resolve(path.dirname(require.main.filename)+ '/simpleMathOps.js'))
var moment = require('moment')

var _ = require('underscore')

function diff(a,b) { // see how a is different from b
    var r = {};
    _.each(a, function(v,k) {
        if(b[k] === v) return;
        // but what if it returns an empty object? still attach?
        r[k] = _.isObject(v)
                ? _.diff(v, b[k])
                : v
            ;
        });
    return r;
}

var emailManager = require(path.resolve(__dirname+'/emailDispatcher.js'))

module.exports = {
	init,
	auth: {
		checkIfUserIsFree,
		autoLogin,
		//noPassLogin,
		tryLogin,
		generateLoginKey,
		checkAccount
	},
	profile: {
		updatePassword,
		updateAccount,
		createAccount,
		resendEmail,
		generatePasswordKey,
		getProfile,
		getProfileBySocket,
		validateRegistrationKey,
		activateAccount,
		deleteAccount
	},
	usefulFunctions: {
		validateEmail
	}
}

function init(db) {
	if (accounts && accountsUpdateLogs) {
		console.log('UAM Init already done!')
	}
	else {
		accounts = db.collection('accounts')
		accountsUpdateLogs = db.collection('accountsUpdateLogs')
	}
}

function logUpdate(record, num) {
	if (!num) {num=0}
	accountsUpdateLogs.insertOne(record, function(e,o) {
		if (e) {
			if (num < 2) {
				logUpdate(record,num)
			}
			else {
				return
			}
		}
		return
	});
}

function validateEmail(email){

	if (!email) {
		return false;
	}

	else if (email.length > 254) {
		return false;
	}

	else if (/^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/.test(email) == false) {
		return false;
	}
	else {
		var parts = email.split("@");
		var domainParts = parts[1].split(".");
		if (parts[0].length > 64) {
			return false;
		}
		else if (domainParts.some(function (part) { return part.length > 63; })) {
			return false;
		}
		else {
			return true;
		}
	}


}

function generatePasswordKey(email, callback) {
	let passKey = simpleMathOps.randCode().toString()
	let modificationLogRecord = {
		dateUpdate: moment().format('DD-MM-YYYY HH:mm:ss:S'),
		reason: "pass-reset-request"
	}
	accounts.findOneAndUpdate({email:email}, {$set:{
		passKey : passKey,
		passKeyDate: moment().unix()
	}, $unset:{cookie:''}}, {returnOriginal : false}, function(e, o){
		if (o.value){
			o.value.dateUpdate = modificationLogRecord.dateUpdate
			modificationLogRecord.user = o.user
			callback(null, o.value);
			logUpdate(modificationLogRecord)
		}	else{
			callback(e || 'account-not-found');
		}
	});
}

function checkAccount(email, user, callback)
{
	if (email) {
		accounts.findOne({email:email}, callback);
	}
	else if (user) {
		accounts.findOne({user:user}, callback);
	}
	else {
		callback('no-data-specified')
	}
}

function resendEmail (email, callback)
{
	accounts.findOne({email:email}, function(e,o) {
		if (e) {
			callback("error");
		}
		else if (o) {
			if (o.emailResendAttempts) {
				o.emailResendAttempts = o.emailResendAttempts + 1;
			}
			else {
				o.emailResendAttempts = 1;
			}
			o.regKey = simpleMathOps.randCode().toString();
			o.modificationLog = {
				user: o.user,
				dateUpdate: moment().format('DD-MM-YYYY HH:mm:ss:S'),
				reason: "email-resend"
			}
			findOneAndUpdate(o, email);
			var emailData = {
				user: o.user,
				firstname: o.firstname,
				lastname: o.lastname,
				dateCreation: o.dateCreation,
				regKey: o.regKey,
				email: o.email
			}
			emailManager.profile.dispatchRegistrationValidationLink(emailData);
			
		}
	});
	let findOneAndUpdate = function(o, email){
		
		accounts.findOneAndUpdate({email:email}, {$set:{emailResendAttempts: o.emailResendAttempts, regKey: o.regKey}}, {returnOriginal : false}, callback);
		logUpdate(o.modificationLog)
	}
	
}

function createAccount (newData, callback) {
	accounts.findOne({user:newData.user}, function(e, o) {
		if (o){
			callback('username-taken');
		}
		else if (newData.user.length < 6) {
			callback('username-too-short');
		}
		else if (newData.pass.length < 6) {
			callback('pass-too-short');
		}
		else if (validateEmail(newData.user) == true) {
			callback('username-and-email-cannot-be-same');
		}
		else if (!newData.firstname || !newData.lastname || !newData.pass || !newData.email) {
			callback('data-missing');
		}
		else{
			accounts.findOne({email:newData.email}, function(e, o) {
				if (o){
					callback('email-taken');
				}	else{
					let regKey = simpleMathOps.randCode();
					var dateCreation = moment().format('DD-MM-YYYY HH:mm:ss:S');
					var emailData = {
						user: newData.user,
						firstname: newData.firstname,
						middlename: newData.middlename,
						lastname: newData.lastname,
						//gender: newData.gender,
						dateCreation: dateCreation,
						regKey: regKey,
						email: newData.email
					}
					if (newData.middlename) {emailData.middlename = newData.middlename};
					//console.log(emailData);
					saltAndHash(newData.pass, function(hash){
						newData.pass = hash;
						newData.regKey = regKey;
						newData.userActivated = false;
						newData.accountRoles = newData.accountRoles || ['user']
						let modificationLog = {
							user: newData.user,
							dateUpdate: moment().format('DD-MM-YYYY HH:mm:ss:S'),
							reason: "sign-up"
						}
//						accounts.insertOne(newData, callback);
						emailManager.profile.dispatchRegistrationValidationLink(emailData);
						accounts.insertOne(newData, callback);
						logUpdate(modificationLog)
					});
				}
			});
		}
	});
}

//$push: { modificationLog: { $each: [modificationLogRecord], $position: 0 } },
//o.modificationLog = {
//	dateUpdate: moment().format('DD-MM-YYYY HH:mm:ss:S'),
//	reason: "email-resend"
//}

function updateAccount (newData, callback)
{
	let findOneAndUpdate = function(data, oldData){
		var o = {
			firstname: data.firstname,
			middlename: data.middlename,
			lastname : data.lastname,
			email : data.email.toLowerCase(),
			gender: data.gender,
			pass: data.pass,
			bday: data.bday,
			address: data.address,
			phone: data.phone,
			docType: data.docType,
			docNum: data.docNum,
			taxNumber: data.taxNumber,
			snilsNumber: data.snilsNumber,
			insPolicy: data.insPolicy,
			insPolicyNum: data.insPolicyNum
		}
		var differences = diff(o, oldData)
		delete differences.pass
		
		Object.keys(differences).forEach(function(key,index) {
			differences[key] = {
				original: oldData[key],
				change: o[key],
			}
		});
		
		let modificationLogRecord = {
			user: oldData.user,
			dateUpdate: moment().format('DD-MM-YYYY HH:mm:ss:S'),
			reason: "profile-update",
			differences: differences
		}
		
		if (data.pass && data.pass.length > 0) o.pass = data.pass;
		if (Object.keys(differences).length > 0 || data.pass) {
			accounts.findOneAndUpdate({_id:getObjectId(data.id)}, {$set:o}, {returnOriginal : false}, callback);
			logUpdate(modificationLogRecord)
		}
		else {
			let o = {
				value: oldData
			}
			callback(null,o)
		}
	}
	accounts.findOne({_id:getObjectId(newData.id)}, function(e,r) {
		if (e || r == null) {
			var error = {
				code: 401,
				status: "error",
				error: "could-not-find-account"
			}
			callback(error)
		}
		else {
			if (newData.email != r.email) {
				
				validatePassword(newData.oldPass, r.pass, function(err, res) {
					if (err || res == null) {
						var error = {
							code: 401,
							status: "error",
							error: "wrong-old-pass"
						}
						callback(error)
					}
					else {
						findOneAndUpdate(newData, r);
					}
				})		
			}
			else { 
				if (newData.pass) {
					saltAndHash(newData.pass, function(hash){
						newData.pass = hash;
						validatePassword(newData.oldPass, r.pass, function(err, res) {
							if (err || res == null) {
								var error = {
									code: 401,
									status: "error",
									error: "wrong-old-pass"
								}
								callback(error)
							}
							else {
								findOneAndUpdate(newData, r);
							}
						})
					})
				}
				else {
					findOneAndUpdate(newData, r);
				}	
			}
		}
	})
}

function deleteAccount(id, callback) {
	accounts.deleteOne({_id: getObjectId(id)}, callback);
}


function checkIfUserIsFree(user, callback) {
	accounts.findOne({user:user}, function(e, o) {
		if (o) {
			callback(null, "found")
		}
		else {
			callback(e || 'not-found')
		}
	})
}

function generateLoginKey (user, ipAddress, callback)
{
	let cookie = simpleMathOps.guid();
	accounts.findOneAndUpdate({user:user}, {$set:{
		ip : ipAddress,
		cookie : cookie
	}}, {returnOriginal : false}, function(e, o){ 
		callback(cookie);
	});
}

function autoLogin(user, pass, callback)
{
	accounts.findOne({user:user}, function(e, o) {
		if (o){
			o.pass == pass ? callback(o) : callback(null);
		}	else{
			callback(null);
		}
	});
}

function getProfile (user, callback) {
	accounts.findOne({user:user}, function(e, o) {
		if (o == null){
			callback('user-not-found');
		}	
		else{
			callback(null, o);
		}
	})
}

function getProfileBySocket (user, callback) {
	accounts.findOne({user:user, }, function(e, o) {
		if (o == null){
			callback('user-not-found');
		}	
		else{
			callback(null, o);
		}
	})
}

function tryLogin (user, pass, callback)
{
	accounts.findOne({$or: [{user: user}, {email: user}] }, function (e, o) {
		if (e) {
			callback(e)
		}
		if (o == null) {
			callback('account-not-found', null);
		} 
		else {
			validatePassword(pass, o.pass, function (err, res) {
				if (res) {
					if (o.locked == true) {
						callback('locked', null);
					}
					else if (!o.userActivated == true) {
						callback('unactivated', null);
					}
					else {
						callback(null, o);
					}
				} else {
					callback('wrong-pass', null);
				}
			});
		}
	});
}

function updatePassword (passKey, newPass, email, callback)
{
	//const hasher = crypto.createHash('sha256');
	saltAndHash(newPass, function(hash){
		newPass = hash;
		accounts.findOneAndUpdate({passKey:passKey, email:email}, {$set:{pass:newPass}, $unset:{passKey:''}}, {returnOriginal : false}, callback);
	});
}

function validateRegistrationKey(email,regKey,callback) {
	accounts.findOne({email:email, regKey:regKey}, function(e,o) {
		//console.log(email)
		//console.log(regKey)
		if (o) {
			let modificationLogRecord = {
				dateUpdate: moment().format('DD-MM-YYYY HH:mm:ss:S'),
				reason: "activation",
				user: o.user
			}
		
			callback(e,o)
			logUpdate(modificationLogRecord)
		}
		else {
			callback(e,o)
		}
	});
}

function activateAccount (email, callback)
{
	let findOneAndUpdate = function(data){
		
		var o = {
			userActivated: true,
			regKey: null,
		}
	
		accounts.findOneAndUpdate({email:email}, {$set:o}, {returnOriginal : false}, callback);
	}
	
	findOneAndUpdate();
}

var validatePassword = function(plainPass, hashedPass, callback)
{
	//console.log("plainPass: " + plainPass)
	//console.log("hashedPass: " +hashedPass)
	var salt = hashedPass.substr(0, 64);
	//console.log("salt: " + salt)
	crypto.scrypt(salt + plainPass, salt, 128, (err, derivedKey) => {
  		if (err) { 
  			console.err(err)
  			if (callback) {
  				callback("error",null)
  			}
  			else {
  				return err;
  			}
  		}
  		else {
  			//console.log("derivedKey: " + derivedKey.toString("hex"))
  			if (salt + derivedKey.toString("hex") === hashedPass) {
  				if (callback) {
  					callback(null, true);
  				}
  				else {
  					return true;
  				}
  			}
  			else {
  				if (callback) {
  					callback("error",null)
  				}
  				else {
  					return false;
  				}
  			}
  		}
	});
}

var getObjectId = function(id)
{
	return new require('mongodb').ObjectID(id);
}

var listIndexes = function()
{
	accounts.indexes(null, function(e, indexes){
		for (var i = 0; i < indexes.length; i++) console.log('index:', i, indexes[i]);
	});
}

function validateEmail(email) {
	var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(String(email).toLowerCase());
}

var generateSalt = function()
{
	var salt = crypto.randomBytes(128).toString('base64').slice(0, 64);
	return salt;
}

var saltAndHash = function(pass, callback)
{

	var salt = generateSalt();
	
	crypto.scrypt(salt + pass, salt, 128, (err, derivedKey) => {
  		if (err) { 
  			//console.err(err)
  			if (callback) {
  				callback("fail")
  			}
  			else {
  				return "fail"
  			}
  		}
  		else {
  			//console.log(derivedKey.toString("hex"))
  			if (callback) {
  				callback(salt + derivedKey.toString("hex"));
  			}
  			else {
				console.log(salt + derivedKey.toString("hex"))
  				return salt + derivedKey.toString("hex")
  			}
  		}
	});
}

