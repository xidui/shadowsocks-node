/**
 * Created by apple on 15/3/29.
 */
var net = require('net');
var utils = require('./util.js');

var STAGE_INIT                      = 0;
var STAGE_REPLY_SOCKS               = 1;
var STAGE_ESTIBLISH_REMOTE          = 4;
var STAGE_ESTIBLISH_REMOTE_DONE     = 5;

var IPV4                            = 1;
var DOMAIN                          = 3;
var IPV6                            = 4;

var Client = function (connection) {
    this.conn = connection;
    this.remote = null;
    this.stage = STAGE_INIT; // sttsh
    this.conn.client = this;
}

exports.Client = Client;

Client.prototype.localRegist = function (){
    this.conn.on("data", Client.localOnData);
    this.conn.on("end", Client.localOnEnd);
    this.conn.on("error", Client.localOnError);
    this.conn.on("close", Client.localOnClose);
    this.conn.on("drain", Client.localOnDrain);
}

Client.prototype.remoteRegist = function (){
    this.remote.on("data", Client.remoteOnData);
    this.remote.on("end", Client.remoteOnEnd);
    this.remote.on("error", Client.remoteOnError);
    this.remote.on("close", Client.remoteOnClose);
    this.remote.on("drain", Client.remoteOnDrain);
}

Client.localOnData = function (data){
    var client = this.client;
    var remote = this.client.remote;
    if (STAGE_INIT === client.stage){
        var reply = new Buffer(2);
        reply.write("\u0005\u0000", 0); // sttsh
        this.write(reply);
        this.client.stage = STAGE_REPLY_SOCKS;
        return;
    }
    if (STAGE_REPLY_SOCKS === client.stage){
        var addrType = data[3];
        var addrLen = 0;
        /* addrType有三种情况
         * 1:ipv4地址
         * 3:域名
         * 4:ipv6地址
         *  */
        if (3 === addrType){
            addrLen = data[4];
        }
        else if (1 !== addrType && 4 !== addrType){
            console.log('not valid attrtype:' + addrType);
            return;
        }

        // 解析请求头
        var addr, port, header;
        if (IPV4 === addrType){
            addr = utils.inetNtoa(data.slice(4, 8));
            port = data.readUInt16BE(8);
            header = 10;
        }else if (DOMAIN === addrType){
            addr = data.slice(5, 5 + addrLen).toString("binary");
            port = data.readUInt16BE(5 + addrLen);
            header = 5 + addrLen + 2;
        }else if (IPV6 === addrType){
            addr = inet.inet_ntop(data.slice(4, 20));
            port = data.readUInt16BE(20);
            header = 22;
        }

        // 构造socks应答
        var buf = new Buffer(10); // why here must be 10, if be header, it will be wrong?
        buf.write("\u0005\u0000\u0000\u0001", 0, 4, "binary"); // ?
        buf.write("\u0000\u0000\u0000\u0000", 4, 4, "binary");
        buf.writeInt16BE(2222, 8);
        this.write(buf);

        remote = net.connect(port, addr, function(){
            if (client.remote) {
                client.remote.setNoDelay(true);
            }
            client.stage = STAGE_ESTIBLISH_REMOTE_DONE;
            this.client = client;
        });
        client.remote = remote;
        client.remoteRegist();
        if (data.length > header) {
            buf = new Buffer(data.length - header);
            data.copy(buf, 0, header);
            client.remote.write(buf);
        }
        client.stage = STAGE_ESTIBLISH_REMOTE;
        return;
    }
    if (STAGE_ESTIBLISH_REMOTE === client.stage ||
        STAGE_ESTIBLISH_REMOTE_DONE === client.stage){
        remote.write(data);
    }
}

Client.localOnEnd = function (){
}

Client.localOnError = function (error){
}

Client.localOnClose = function (had_error){
}

Client.localOnDrain = function (){
}

var abc = 0;

Client.remoteOnData = function (data){
    this.client.conn.write(data);
}

Client.remoteOnEnd = function (){
}

Client.remoteOnError = function (error){
}

Client.remoteOnClose = function (had_error){
}

Client.remoteOnDrain = function (){
}