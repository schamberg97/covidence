const moment = require('moment');
var baseurl = process.env.SITE_URL || 'http://localhost:8000';
const nodemailer = require("nodemailer");
var emailServer
var emailFrom
var path = require('path')
const {
    Worker, isMainThread, parentPort, workerData
} = require('worker_threads');
var messagesQueue = []
var poolMode

function createTransport(emailSettings) {
    if (!emailSettings.poolEnabled) {
        emailSettings.pool = true
        poolMode = true
    }
    else {
        emailSettings.pool = emailSettings.poolEnabled=='true'
        if (emailSettings.poolEnabled == "true") {
            poolMode = true
        }
        delete emailSettings.poolEnabled
    }
    emailServer = nodemailer.createTransport(emailSettings);
    setInterval(send, 5000)
    function send() {
        //console.log('i am here 1')
        
        send_()
        function send_(n) {
            if (!n) {
                var n = 0;
            }
            if (messagesQueue.length && n < 50) {
                let message = messagesQueue.shift()
                if (message.type && message.user) {
                    let similarMessages = messagesQueue.filter(item => item.user == message.user && item.type == message.type) 
                    if (similarMessages.length > 0) {
                        similarMessages.splice(similarMessages.length-1, 1)
                        messagesQueue = messagesQueue.filter(function(el) { return similarMessages.indexOf(el) < 0; })
                    }
                    else {
                        finishSend()
                    }
                }
                else {
                    finishSend()
                }
                function finishSend() {
                    if (!message.time || moment().diff(message.time, 'milliseconds') < 12000) {
                        emailServer.sendMail(message.msg, function(e,o) {

                        });
                    }
                    else {
                        emailServer.sendMail(message.msg)
                    }
                }
                n++
                send_(n)
            }
        }
        
    }
}

var emailConnectionSettings
var messageSettings
function init() {
    
        if (process.env.EMAIL_HOST) {
            emailConnectionSettings = {
                emailFrom: process.env.EMAIL_FROM,
                supportEmail: process.env.SUPPORT_EMAIL,
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                secure: process.env.EMAIL_SECURE,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            }
            createTransport(emailConnectionSettings)
            finalInit()
        }
        else {
            nodemailer.createTestAccount((err, account) => {
                if (err) {
                    console.error('Failed to create a testing account. ' + err.message);
                    return process.exit(1);
                }
                else {
                    console.log('Credentials obtained');
                    console.log(account)
                    emailConnectionSettings = {
                        emailFrom: account.user,
                        supportEmail: account.user,
                        host: account.smtp.host,
                        port: account.smtp.port,
                        secure: account.smtp.secure,
                        auth: {
                            user: account.user,
                            pass: account.pass
                        }
                    }
                    createTransport(emailConnectionSettings)
                    finalInit()
                }
            })
        }
    
}

function finalInit() {
    if (emailConnectionSettings.emailFrom) {
        emailFrom = emailConnectionSettings.emailFrom
    }
    else {
        if (/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(emailConnectionSettings.auth.user)) {
            emailFrom = emailConnectionSettings.auth.user
        }
        else {
            emailFrom = emailConnectionSettings.auth.user + '@' + emailConnectionSettings.host
            if (!/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(emailFrom)) {
                console.log("emailFrom: " + emailFrom + ' appears to be wrong. Contact support or debug')
                process.exit(1)
            }
        }
    }
}




module.exports = {
    init,
    profile: {
        dispatchRegistrationValidationLink,
        dispatchResetPasswordLink
    },
    admin: {
        testEmail
    }
}

function dispatchResetPasswordLink (account, locale, callback)
{
    
    settings.get('global', function(globalSettings) {
        let msg = {
            from: emailFrom,
            to: account.email,
            subject: `[COVID-19] Сброс пароля`,
            text         : `Для сброса пароля, воспользуйтесь этим ключом в приложении: ${account.passKey}`,
            //html   : composeResetEmail(account, locale, globalSettings)
        }
        if (poolMode == true) {
            let now = moment()
            let msgObject = {
                msg,
                callback,
                time: now,
                user: account.user,
                type: "password-reset"
            }
            messagesQueue.push(msgObject)
            setTimeout(respond, 12250)
            function respond() {
                try {
                    callback(null,"ok")
                }
                catch(e) { }
            }
        }
        else {
            emailServer.sendMail(msg,callback);
        }
    })
}

function dispatchRegistrationValidationLink(account, locale, callback) {
    if (!callback) {
        callback = function(e,o) {
            console.log(e,o)
        }
    }
    settings.get('global', function(globalSettings) {
        let msg = {
            from: emailFrom,
            to: account.email,
            subject: `[${globalSettings.siteInfo.names[locale]}] ${__('Registration confirmation')}`,
            text: `Для подтверждения учётной записи, скопируйте и воспользуйтесь этим ключом в приложении: ${account.regKey}`,
            //html: composeRegistrationValidationEmail(account, locale, globalSettings)
        }
        if (poolMode == true) {
            let now = moment()
            let msgObject = {
                msg,
                callback,
                time: now,
                user: account.user,
                type: "signup"
            }
            messagesQueue.push(msgObject)
            setTimeout(respond, 12250)
            function respond() {
                try {
                    callback(null,"ok")
                }
                catch(e) { }
            }
        }
        else {
            emailServer.sendMail(msg,callback);
        }
    })
}

function testEmail(account, locale, callback) {
    if (!callback) {
        callback = function(e,o) {
            console.log(e,o)
        }
    }
    settings.get('global', function(globalSettings) {
        let msg = {
            from: emailFrom,
            to: account.email,
            subject: `Test email`,
            text: `Test email`,
            html: '<html><head></head><body><h2>This is a test email.</h2><p>If you had received it, email works properly on your QUIK.CMS server</p></body></html>'
        }
        if (poolMode == true) {
            let now = moment()
            let msgObject = {
                msg,
                callback,
                time: now,
                user: account.user,
                type: "test-email"
            }
            messagesQueue.push(msgObject)
            setTimeout(respond, 12250)
            function respond() {
                try {
                    callback(null,"ok")
                }
                catch(e) { }
            }
        }
        else {
            emailServer.sendMail(msg,callback);
        }
    })
}