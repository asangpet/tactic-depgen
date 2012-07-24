var http=require('http'),
    url=require('url'),
    child_process=require('child_process'),
    myutil=require('./myutil'),
    express=require('express'),
    async = require('async');

var hostname = "unknown";

var port = 80;
var localhostmap = { lb:["localhost"],
                proxy:["localhost"],
                app:["localhost"],
                db:["localhost"],
                log:["localhost"],
                searcher:["localhost"],                
                search:["localhost"] };

var dynamichostmap = { lb:["node1v2","node1v3"],
    proxy:["node1v4","node1v5","node1v6"],
    app:["node1v7","node1v8","node1v9"],
    db:["node1v10"],
    log:["node1v11"],
    searcher:["node1v12"],                
    search:["node1v13","node1v14","node1v15"] };

var hostmap = dynamichostmap;

var counter = { lb:0, proxy:0, search:0 };

var dbtable = [];

var searchcount = 0;

var dep_url = "http://10.43.1.1";

var app = express.createServer();
app.listen(port);

app.get('/', function(req, resp) {
    resp.send('Hello');
});

app.get('/composite', function(req, resp) {
    var requestTime = Date.now();
    async.series([
        forward(dep_url+"/terminal"),
        worker(500),
        forward(dep_url+"/terminal"),
        worker(100),
        function(callback) {
            respond(requestTime, resp, "Composite")();
            callback();
        }
    ]);
});

app.get('/distributed', function(req, resp) {
    var requestTime = Date.now();
    async.parallel([
        forward(dep_url+"/terminal"),
        forward(dep_url+"/terminal"),
        worker(500)
   ], function(err, result) {
        work(100, 1, respond(requestTime, resp, "Distributed"));
    });
});

app.get('/nested', function(req, resp) {
    var requestTime = Date.now();
    async.parallel([
        forward(dep_url+"/composite"),
        forward(dep_url+"/composite")
   ], function(err, result) {
        work(100, 1, respond(requestTime, resp, "Nested"));
    });
});

app.get('/terminal', function(req, resp) {
    var requestTime = Date.now();
    async.series([
        worker(100),
        function(callback) { 
            respond(requestTime, resp, 'terminal')();
            callback();
        }
    ]);
});

function forward(uri, callback) {
    var fn = function(callback) {
        // Call firsit dependency
        http.get(uri, function(result) {
            console.log("Got response: "+result.statusCode);
            callback();
        });
    };
    return fn;
}

function respond(requestTime, response, msg) {
    var fn = function() {
        var responseTime = Date.now() - requestTime
        response.send(msg+" "+responseTime+" ms");
    };
    return fn;
}

function worker(time, callback) {
    var fn = function(callback) {
        work(time, 1, callback);
    };
    return fn;
}

function work(totalTime, portion, callback) {
    console.log('working '+totalTime+' '+portion);

    var workTime = portion * totalTime;
    var startTime = Date.now();
    var endTime = startTime + workTime;

    console.log('start '+startTime+' endtime '+endTime)
    var value = 1;
    while (Date.now() < endTime) {
        value = value + Math.random();
        if (value > Math.random()) {
            value = 1;
        }
    }
    var calcTime = Date.now();
    var diffTime = startTime + totalTime - calcTime;
    console.log('current '+calcTime +' diff time ' + diffTime);
    if (diffTime > 0) {
        setTimeout(callback, diffTime);
    } else {
        callback();
    }
}

function delay(value,factor) {
    var k = 0;
//    for (i=0;i<2*factor;i++) { k=k+0.14*value+100/2/(k+1); }    
    for (i=0;i<10000*factor;i++) { k=k+value/(k+1); }    
}

process.on('uncaughtException', function(err) {
    console.log(err);
});

child_process.exec('hostname',
    function (error, stdout, stderr) {
        hostname = myutil.trim(stdout);
        console.log('Server running at '+hostname+':'+port);
    }
);                                

//console.log('Server running at localhost:'+port);
