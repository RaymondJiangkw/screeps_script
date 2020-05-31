const utils = require('utils')
const remoteCentralRooms = require('configuration.Observer').coreDominance
module.exports = function(){
    for (var roomName of global.rooms.my){
        if (Game.rooms[roomName].repairTargets.length > 0) Game.rooms[roomName].AddRepairTask("local","repair")
    }
    for (var roomName of global.rooms.reserved) {
        var home = utils.getClosetSuitableRoom(roomName,6)
        if (!home) continue
        if (Game.rooms[roomName].repairTargets.length > 0) Game.rooms[home].AddRepairTask("remote","repair",{x:25,y:25,roomName:roomName,fake:true})
    }
    for (var roomName of global.rooms.central) {
        if (roomName in remoteCentralRooms){
            const enemies = _.filter(Game.rooms[roomName].enemies,(c)=>utils.Adjacent(c,_.map(remoteCentralRooms[roomName],Game.getObjectById),3));
            if (enemies.length > 0) continue;
            var home = utils.getClosetSuitableRoom(roomName,6,true);
            if (!home) continue;
            if (Game.rooms[roomName].repairTargets.length > 0) Game.rooms[home].AddRepairTask("remote","repair",{x:25,y:25,roomName:roomName,fake:true});
        }
    }
}