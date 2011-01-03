var path = require('path'),
    fs = require('fs');

exports.load_static_file = function(uri,response) {
    var filename = path.join(process.cwd(),uri)
    path.exists(filename,function(exists) {
        if(!exists) {
            response.writeHead(404,{"Content-Type":"text/plain"});
            response.end("404 Not Found\n");
            return;
        }
        fs.readFile(filename,"binary",function(err,file) {
            if (err) {
                response.writeHead(500,{"Content-Type":"text/plain"});
                response.end("Internal file reading error\n");
                return;
            }
            response.writeHead(200);
            response.write(file,"binary");
            response.end();
        });
    });
}

exports.request = function(client,depend_host,uri,processor) {
        var request = client.request("GET",uri,{"host":depend_host});
        request.addListener("response",function(cresponse) {
                var body="";
                cresponse.addListener("data",function(data) {
                    body += data;
                });
                cresponse.addListener("end",function() {
                    var results = JSON.parse(body);
		    processor(results);
                });
            });
        request.end();
}
