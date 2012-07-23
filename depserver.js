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
        function(callback) {
            // Call first dependency
            http.get(dep_url+"/terminal", function(result) {
                console.log("Got response: "+result.statusCode);
                callback();
            });
        },
        function(callback) {
            setTimeout(callback, 1000);
        },
        function(callback) {
            // Call second dependency
            http.get(dep_url+"/terminal", function(result) {
                console.log("Got response: "+result.statusCode);
                var responseTime = Date.now()-requestTime;
                resp.send("All is good self "+responseTime+" ms");
                callback();
            });
        }
    ]);
});

app.get('/terminal', function(req, resp) {
    var i = 1;
    async.series([
        function(callback) { i=i+1; callback(); },
        function(callback) { i=i*10; callback(); },
        function(callback) { resp.send('Ok this is wierd '+i); callback(); }
    ]);
});

/*
router.get('/', function(request,response) {
    var valid_uri = [ "/stream","/store","/lb","/app","/proxy","/log","/db" ]
    response.writeHead(200,{"Content-Type":"application/json"});
    response.write(JSON.stringify(valid_uri));
    response.end();
});

router.get('/stream', function(request,response) {
    var url_client = http.createClient(port,"monitor");        
    myutil.request(url_client,"/list/cpu/hosts",function(json) {
        console.log("Stream: collect "+json.length+" hosts");
        emit(response, json);
    });    
});

router.get('/store', function(request,response) {
   // main load balancer
    var url_client = http.createClient(port,hostmap.app[counter.lb]);
    var mycounter = counter.lb;
    if (++counter.lb >= hostmap.app.length) counter.lb = 0;
    myutil.request(url_client,"/app/"+counter.lb,function(json,ts) {
        json.store = { host:hostname };
        json.app.ts = ts;
        emit(response, json);
    });
});
*/

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
