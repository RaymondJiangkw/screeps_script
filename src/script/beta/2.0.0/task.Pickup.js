module.exports = function(){
    for (var roomName of global.rooms.my){
        if (!Game.rooms[roomName].storage) continue
        if (Game.rooms[roomName].droppedResources.length > 0) Game.rooms[roomName].AddPickUpTask("local","pickUp",undefined,Game.rooms[roomName].storage.id)
    }
}