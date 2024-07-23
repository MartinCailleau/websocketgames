var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var count = 0

app.get('/', function(req, res){
	count++;
	res.sendFile(__dirname + '/index.html');
	//
});


app.get('/jquery', function(req, res){
	count++;
	res.sendFile(__dirname + '/jquery-3.6.4.min.js');
	//
});

var userId = 0;

io.on('connection', function(socket){
  socket.userId = userId ++;
  console.log('a user connected, user id: ' + socket.userId);

  socket.on('spawn', function(msg){
		//msg = JSON.parse(msg);
		console.log('message from user ' + msg.pseudo);
		io.emit("spawn",msg.pseudo);
  });
  
  socket.on('input1', function(msg){
		console.log(msg);
		//msg = JSON.parse(msg);
		console.log("a "+msg.pseudo+" user has pressed input1");
		io.emit("input1",msg.pseudo);
  });
  
  socket.on('input2', function(msg){
		//msg = JSON.parse(msg);
		console.log('user ' + msg.pseudo+" has pressed input2");
		io.emit("input2",msg.pseudo);
  });
  
});


http.listen(3000, function(){
	console.log('listening on *:3000');
});