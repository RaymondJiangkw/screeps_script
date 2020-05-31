const utils = require('utils')
const remoteCentralRooms = require('configuration.Observer').coreDominance
module.exports = function() {
    for (var roomName of global.rooms.my){
        if (Game.rooms[roomName].buildTargets.length > 0) {
            if (Game.rooms[roomName].controller.level > 4) Game.rooms[roomName].AddBuildTask("local","build")
            else{
                var home = utils.getClosetSuitableRoom(roomName,4,true,true)
                if (!home) continue
                Game.rooms[home].AddBuildTask("remote","build",{x:25,y:25,roomName:roomName,fake:true})
            }
        }
    }
    for (var roomName of global.rooms.reserved){
        var home = utils.getClosetSuitableRoom(roomName,6,true)
        if (!home) continue
        if (Game.rooms[roomName].buildTargets.length > 0) Game.rooms[home].AddBuildTask("remote","build",{x:25,y:25,roomName:roomName,fake:true})
    }
    for (var roomName of global.rooms.central){
        if (roomName in remoteCentralRooms){
            const enemies = _.filter(Game.rooms[roomName].enemies,(c)=>utils.Adjacent(c,_.map(remoteCentralRooms[roomName],Game.getObjectById),3));
            if (enemies.length > 0) continue;
            var home = utils.getClosetSuitableRoom(roomName,6,true);
            if (!home) continue;
            if (Game.rooms[roomName].buildTargets.length > 0) Game.rooms[home].AddBuildTask("remote","build",{x:25,y:25,roomName:roomName,fake:true});
        }
    }
}