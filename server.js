const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(express.static(path.join(__dirname, "build")));

app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// app.listen(process.env.PORT || 3000);

io.on('connection', function(socket){
  console.log("New client connected");
  
  //Here we listen on a new namespace called "incoming data"
  socket.on("incoming data", (data)=>{
    // Here we broadcast it out to all other sockets EXCLUDING the 
    // socket which sent us the data
    // The broadcast flag is special because it allows us to emit data to every 
    // client EXCEPT the one that sent us the data. There's no point in sending 
    // data back to the producer so we broadcast on yet another namespace, 
    // outgoing data.
    socket.broadcast.emit("outgoing data", {num: data});
    console.log('broadcast outgoing data', data.userName, data.info.startTime);
    
  });
  
  //A special namespace "disconnect" for when a client disconnects
  socket.on("disconnect", () => console.log("Client disconnected"));
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});