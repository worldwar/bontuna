var koa = require('koa');
var router = require('koa-router')();
var app = koa();
var querystring = require('querystring');
require('koa-qs')(app);
var Bencode = require('bencode');
var _ = require('lodash');

app.use(router.routes());
app.use(router.allowedMethods());

global.clients={}

function makePeerInfo(request) {
	var peer_id = querystring.unescape(request.query.peer_id);
	var ip = request.request.ip;
	var port = request.query.port;
	return {
		"peer id": peer_id,
		"ip": ip,
		"port": port
	};
}

function handle(info_hash, request) {
	if (global.clients[info_hash] === undefined) {
		global.clients[info_hash] = [];
	}
	var event = request.query.event;
	if (event === 'started' || event === 'completed') {
		_.remove(global.clients[info_hash], function (x) {
			return x.ip == request.request.ip && x.port == request.query.port;
		});
		global.clients[info_hash].push(makePeerInfo(request));
	} else if (event === 'stopped') {
		_.remove(global.clients[info_hash], function (x) {
			return x.ip == request.request.ip && x.port == request.query.port;
		});
	}
}

function candidates(info_hash, request) {
	var ip = request.request.ip;
	var port = request.query.port;
	var a =  _.chain(global.clients[info_hash])
	.filter(function(candidate) {
		return candidate.ip != ip || candidate.port != port;
	}).value();
	return a;
}

router.get("/announce", function *(next){
	var info_hash = querystring.unescape(this.query.info_hash);
	handle(info_hash, this);

	var response = {
		interval: 30,
		complete: 20,
		incomplete: 10,
		peers: candidates(info_hash, this)
	};
	this.type = "text/plain; charset=utf-8";
	this.body = Bencode.encode(response);
});

app.listen(3000);
