const utils = require('utils')
module.exports = function() {
    for (var roomName of global.rooms.my){
        if (Game.rooms[roomName].buildTargets.length > 0) {
            if (Game.rooms[roomName].controller.level > 3) Game.rooms[roomName].AddBuildTask("local","build")
            else{
                var home = utils.getClosetSuitableRoom(roomName,4,true,true)
                if (!home) continue
                Game.rooms[home].AddBuildTask("remote","build",{x:25,y:25,roomName:roomName,fake:true})
            }
        }
    }
    for (var roomName of global.rooms.reserved){
        var home = utils.getClosetSuitableRoom(roomName,4,true)
        if (!home) continue
        if (Game.rooms[roomName].buildTargets.length > 0) Game.rooms[home].AddBuildTask("remote","build",{x:25,y:25,roomName:roomName,fake:true})
    }
}