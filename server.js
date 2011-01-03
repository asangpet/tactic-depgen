var http=require('http'),
    url=require('url'),
    myutil = require('./myutil');

var port = 8124
var depend_host = "monitor"

var url_client = http.createClient(5100,depend_host);

http.createServer(function (request,response) {
    var uri = url.parse(request.url).pathname;
    
    if (uri === "/stream") {
	myutil.request(url_client,depend_host,"/list/cpu/hosts",function(json) {
	    console.log("Collect "+json.length+" hosts");
	    response.writeHead(200,{"Content-Type":"application/json"});
	    response.write(JSON.stringify(json));
	    response.end();		
	});
    } else {
        myutil.load_static_file(uri,response);
    }
}).listen(port);

console.log('Server running at localhost:'+port);

