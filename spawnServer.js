var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var count = 0

app.get('/spawn', function(req, res){
	count++;
	res.send("<body>Spawn " + count + " objects</body>");
	io.emit("spawn_obj_1",req.param('name'));
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});
