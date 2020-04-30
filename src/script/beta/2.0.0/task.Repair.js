const utils = require('utils')
module.exports = function(){
    for (var roomName of global.rooms.my){
        if (Game.rooms[roomName].repairTargets.length > 0) Game.rooms[roomName].AddRepairTask("local","repair")
    }
    for (var roomName of global.rooms.reserved) {
        var home = utils.getClosetSuitableRoom(roomName,4)
        if (!home) continue
        if (Game.rooms[roomName].repairTargets.length > 0) Game.rooms[home].AddRepairTask("remote","repair",{x:25,y:25,roomName:roomName,fake:true})
    }
}