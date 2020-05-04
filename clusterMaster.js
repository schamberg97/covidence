
/*
    This code belongs to Nicholas Schamberg and licensed to you under MIT license. See LICENSE file
*/

var path = require('path')

var cluster = require('cluster')

var numProc = parseInt(process.env.NUM_PROC) || require('os').cpus().length;
var totalShutdown


function toBoolean(str) {
    return str === 'true';
}

cluster.setupMaster({
    exec: 'app.js',
    silent: toBoolean(process.env.SILENT_WORKERS)
});

for (let i = 0; i < numProc; i++) {
    if (process.env.DEBUG_MODE == "true") {
        console.log('Spawning worker process')
    }
    cluster.fork()

}
console.log(`Master ${process.pid} is running`);
const { RateLimiterClusterMaster } = require('rate-limiter-flexible');
new RateLimiterClusterMaster();


function restartWorker() {
    if (totalShutdown != "true") {
        console.log("Worker is gonna be dead soon. Long live the worker")
        let worker = cluster.fork()
        worker.on('message', messageHandler);
        //worker.on('exit', deathHandler)
    }
}

cluster.on('exit', (worker, code, signal) => {
    if (code !== 0 && totalShutdown != "true") {
        console.log(code)
        console.log('worker failed. starting new one')
        cluster.fork()
    }
});

cluster.on('message', (worker, msg) => {
    messageHandler(msg)
});

function messageHandler(msg) {
    if (msg && msg.contents) {
        console.log(msg)
        switch (msg.contents.code) {
            case "start-up":
                console.log(`Worker #${msg.contents.workerID} is starting`)
                break;
            case "connected-to-db":
                console.log(`Worker #${msg.contents.workerID} connected to DB`)
                break;
            case "web-operational":
                console.log(`Worker #${msg.contents.workerID} is serving content`)
                break;
            case "worker-shutdown":
                restartWorker()
                console.log(`Worker #${msg.contents.workerID} is shutting down`)
                break;
            case "restart-request":
                restartInProgress = true
                console.log(`Worker #${msg.contents.workerID} requested global workers restart`)
                for (const id in cluster.workers) {
                    cluster.workers[id].disconnect()
                    let timeout = setTimeout(() => {
                        if (cluster.workers[id]) {
                            cluster.workers[id].kill();
                        }
                    }, 7500);
                }

                break;
        }
    }
}
