module.exports = {
    authRequired,
    onlyForUnauthorized,
    badData
}

function authRequired(req, res) {
    res.status(401).json({
        code: 401,
        status: "unauthorized",
    })
}

function onlyForUnauthorized(req,res) {
    res.status(403).json({
        code: 403,
        status: "only-for-unauthorized",
    })
}

function badData(req, res) {
    res.status(400).json({
        code: 400,
        status: "error",
        error: "bad-data"
    })
}