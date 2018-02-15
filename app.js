const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);

const port = 50100;
app.use(express.static(__dirname + '/'));
app.get("/with", function(req,res){
  res.sendfile(__dirname+"/with.html");
})
app.get("/mini", function(req,res){
  res.sendfile(__dirname+"/mini.html");
})

var members = [];
var messages = [];
var mHeartBeatInterval = null;
var mConnectingBroadcastMembers = {};
const INTERVAL_TIME = 1000;
const WORDS = require("./WordDictionary.json");

server.listen(port);

io.sockets.on('connection', function(client){
  console.log('connected: ' + client.id);

  client.on('requestName',function(data){
    console.log(client.id);
    addInitMember(client.id);
    client.emit('requestName',{name:client.id,id:client.id});
    io.sockets.emit('addMember',{id:client.id,name:client.id});
  });

  client.on('requestUpdateName',function(data){
    // name:"name"
    updateMemberName(client.id,data.name);
    updateUserNameOnMessage(client.id,data.name);
    io.sockets.emit("updateName",{member:{id:client.id,name:data.name}, messages:messages});
  });

  client.on('requestCurrentStatus',function(data){
    client.emit("currentStatus",{messages:messages,members:members});
  });

  client.on('sendTypeStatus',function(data){
    io.sockets.emit("typeStatus",data);
  });

  client.on("disconnect", function(data){
      deleteMember(client.id);
      delete mConnectingBroadcastMembers[client.id];
      
      console.log("disconnect");
      console.log(members);
      io.sockets.emit("deleteMember",{id:client.id});
      if(members.length == 0){
        messages = [];
      }
      if(Object.keys(mConnectingBroadcastMembers).length == 0){
        stopHeartBeat();
      }
  });

  client.on("randomBroadcast", function(data){
    mConnectingBroadcastMembers[client.id] = new Date().getTime();
    startHeartBeat(()=>broadcastRandomMessage(client));
  });

/*
  messageを送りたい
*/
  client.on("sendMessage",function(data){
    data.time = data.time || new Date()
    data.id = data.id || client.id
    io.sockets.emit("message",data);

  });
});


function addInitMember(id){
  members.push({
    id:id,
    name:id
    });
  return true;
}

function updateMemberName(id,name){
  members = members.filter(function(elm,ind,arr){
    return elm.id != id;
  });
  members.push({id:id,name:name});
  return true;
}

function updateUserNameOnMessage(id,name){
  messages = messages.map(function(elm,ind,arr){
    // message, id, name
    console.log(elm);
    if(elm.id == id){
      elm.name = name;
    }
    return elm;
  });
  console.log(messages);
  return true;
}

function deleteMember(id){
  members = members.filter(function(elm,ind,arr){
    return elm.id != id;
  });
  return true;
}

function pushMessage(messageObj){
  messages.push(messageObj);
  return true;
}

// Broadcaster

function broadcastRandomMessage(socket){
  var messageData = {
    message: WORDS[Math.floor(Math.random() * 1000) % WORDS.length],
    id: "BOT",
    name: "BOT",
    time: new Date()
  }
  console.log("broadcast")
  
  Object.keys(mConnectingBroadcastMembers).forEach(function(elm, ind, arr){
    io.to(elm).emit("message", messageData)
  });

}

function startHeartBeat(callback){
  if(mHeartBeatInterval){
    clearInterval(mHeartBeatInterval);
  }
  mHeartBeatInterval = setInterval(callback, INTERVAL_TIME);
}

function stopHeartBeat(){
  clearInterval(mHeartBeatInterval);
  console.log("Broadcast menbers: " + mConnectingBroadcastMembers)
  mHeartBeatInterval = null;
}