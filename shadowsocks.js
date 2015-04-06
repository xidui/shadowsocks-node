var net = require('net');
var utils = require('./util.js');
var args = utils.parseArgs();
var Client = require('./client.js').Client;
global.config = require('./util.js').loadConfig();

var connections = 0;
var server = net.createServer(function(connection){
    ++connections;
    console.log("connections : ", connections);
    var client = new Client(connection);
    client.localRegist();
});

var addr = '0.0.0.0';
var port = '1080';
if (args['-L']) {
    addr = config.local_address;
    port = config.local_port;
}
if (args['-S']) {
    addr = config.server_address;
    port = config.server_port;
}

server.listen(port, addr, function () {
    console.log('local listening at ' + addr + ':' + port);
});

server.on("error", function(e) {
    if (e.code === "EADDRINUSE") {
        return console.log("Address in use, aborting");
    } else {
        return console.log(e);
    }
});