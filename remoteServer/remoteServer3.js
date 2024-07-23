var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var count = 0

app.get('/', function(req, res){
	count++;
	res.sendFile(__dirname + '/index.html');
	//
});

app.get('/styles.css', function (req, res) {
	res.sendFile(__dirname + '/styles.css');
	//
});


var userId = 0;

io.on('connection', function(socket){
  socket.userId = userId ++;
  console.log('a user connected, user id: ' + socket.userId);

  socket.on('spawn', function(msg){
		//msg = JSON.parse(msg);
	  console.log('message from user ' + msg.pseudo +" "+msg.team);
		io.emit("spawn",msg);
  });
  
  socket.on('input1', function(msg){
		console.log(msg);
		//msg = JSON.parse(msg);
		console.log("a "+msg.pseudo+" user has pressed input1");
		io.emit("input1",msg);
  });
  
  socket.on('input2', function(msg){
		//msg = JSON.parse(msg);
		console.log('user ' + msg.pseudo+" has pressed input2");
		io.emit("input2",msg);
  });
  
});


http.listen(8080, function(){
	console.log('listening on *:8080');
});