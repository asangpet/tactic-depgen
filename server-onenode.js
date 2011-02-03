var http=require('http'),
    url=require('url'),
    child_process=require('child_process'),
    myutil=require('./myutil'),
    Worker=require('webworker').Worker,
    router=require('./choreographer').router();

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

router.get('/test/*', function(request,response,rtime) {
    //console.log(rtime);
    var valid_uri = [ "/test" ];
    var w = new Worker(__dirname+'/worker.js');
    w.onmessage = function(e) {
      response.writeHead(200,{"Content-Type":"application/json"});
      response.write(JSON.stringify(e));
      response.end();
      w.terminate();
    };
    w.postMessage({time:rtime});
});

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

router.get('/lb', function(request,response) {
    // load-balanced proxy
    var url_client = http.createClient(port,hostmap.proxy[counter.proxy]);
    var mycounter = counter.proxy;
    if (++counter.proxy >= hostmap.proxy.length) counter.proxy = 0;
    myutil.request(url_client,"/proxy/"+mycounter,function(json,ts) {
        json.lb = { host:hostname };
        json.proxy.ts = ts;
        emit(response, json);
    });            
});

var cacheProb = 0.7;
var cachedrequest;
router.get('/proxy/*', function(request,response,id) {
    // caching proxy
    var url_client = http.createClient(port,hostmap.app[id]);
    // caching probability
    if (Math.random()<cacheProb && cachedrequest != null) {
        cachedrequest.proxy.cached = true;
        emit(response, cachedrequest);
    } else {
        myutil.request(url_client,"/app/"+id,function(json,ts) {
            json.proxy = { host:hostname, proxyid:parseInt(id), cached:false };
            json.app.ts = ts;
            cachedrequest = json;
            emit(response, json);
        }); 
    }
});

router.get('/app/*', function(request,response,id) {
    // App server
    var db_client = http.createClient(port,hostmap.db[0]);
    var log_client = http.createClient(port,hostmap.log[0]);
    var search_client = http.createClient(port,hostmap.searcher[0]);
    myutil.request(log_client,"/log",function(json,ts) {
        //console.log("Log: " + JSON.stringify(json));
    });
    myutil.request(db_client,"/db",function(json,ts) {
        json.app = {host:hostname, appid:parseInt(id)};
        json.db.ts = ts;
        delay(json.db.value,10);
        myutil.request(db_client,"/db",function(djson,dts,data) {
            data.db.value2 = djson.db.value;
            data.db.ts2 = dts;
            delay(djson.db.value,10);
            myutil.request(search_client,"/searcher",function(sjson,sts,sdata) {
                sjson.searcher.ts = sts;
                sdata.searcher = sjson.searcher;
                sdata.search = sjson.search;
                emit(response, sdata);
            }, data);
        },json);
    });        
});

router.get('/db', function(request,response) {
    // DB server (look sth up)
    k = Math.floor(Math.random()*10000);
    //k = 5;
    json = { db:{host:hostname, value:dbtable[k]} };
    delay(json.value,1);
    emit(response, json);
});

router.get('/searcher', function(request,response) {
    /*
    if (counter.search==hostmap.search.length) {
	if (searchcount >= 2) {
	  searchcount = 0;
	} else {
	  counter.search = 0;
          searchcount++;
	}
    }
    */

    var url_client = http.createClient(port,hostmap.search[counter.search]);
    if (++counter.search >= hostmap.search.length) counter.search = 0;
    myutil.request(url_client,"/search",function(json,ts) {
        json.searcher = { host:hostname };
        json.search.ts = ts;
        emit(response, json );
    });        
});

router.get('/search', function(request,response) {
    k = Math.floor(Math.random()*10000);
    json = {search:{host:hostname, value:dbtable[k]}};
    delay(json.value,5);
    emit(response, json);
});

router.get('/log', function(request,response) {
    json = { log:{host:hostname} };
    emit(response, json);    
});

router.get('/file/*', function(request,response,filename) {
    myutil.load_static_file("/"+filename,response);
});

http.createServer(function (request,response) {
    router.apply(this,arguments);
}).listen(port);

function emit(response,json) {
    response.writeHead(200,{"Content-Type":"application/json"});
    response.write(JSON.stringify(json));
    response.end();
}

function delay(value,factor) {
    var k = 0;
//    for (i=0;i<2*factor;i++) { k=k+0.14*value+100/2/(k+1); }    
    for (i=0;i<10000*factor;i++) { k=k+value/(k+1); }    
}

function timedelay(value) {
    var k = 0;
    for (i=0;i<1000000;i++) { k=k+1; }
}

for (i=0;i<10000;i++) {
    dbtable[i] = i;
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
