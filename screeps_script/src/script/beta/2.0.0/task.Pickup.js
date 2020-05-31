const utils = require('utils')
module.exports = function(){
    for (var roomName of global.rooms.my){
        if (!Game.rooms[roomName].storage) continue
        if (Game.rooms[roomName].droppedResources.length > 0) Game.rooms[roomName].AddPickUpTask("local","pickUp",undefined,Game.rooms[roomName].storage.id)
    }
    for (var roomName of global.rooms.observed) {
        // var tombStones = Game.rooms[roomName].find(FIND_TOMBSTONES,{filter:(t)=>Object.keys(t.store).length > 0});
        if (Game.rooms[roomName].droppedResources.length === 0 || Game.rooms[roomName].enemies.length > 0) continue;
        var home = utils.getClosetSuitableRoom(roomName,6,true);
        if (!home) continue;
        Game.rooms[home].AddPickUpTask("remote","pickUp",{x:25,y:25,roomName:roomName,fake:true},Game.rooms[home].storage.id);
        // for (var tombStone of tombStones) Game.rooms[home].AddTransferTask("remote",tombStone.id,Game.rooms[home].storage.id,undefined,"exhaust",roomName);
    }
}