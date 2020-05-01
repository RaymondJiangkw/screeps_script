const utils = require('utils')
const targetRoomInfo = require('configuration.targetRooms')
const observeConfig = require('configuration.Observer')
const ROOM_INFO_GARBAGE_CHECK_INTERVAL = 1500;
module.exports = function() {
    for (var roomName of global.rooms.my){
        if (Game.rooms[roomName].controller.level < 4 || !Game.rooms[roomName].storage) continue
        if (!Game.rooms[roomName].observer && observeConfig[roomName] && observeConfig[roomName].length > 0) Game.rooms[roomName].AddTravelTask("observerRooms");
        
        if (!observeConfig["travel"][roomName]) continue;
        for (var rooms of observeConfig["travel"][roomName]) {
            for (var room of utils.divideRoomList(rooms)) {
                if (!Game.rooms[room]){
                    Game.rooms[roomName].AddTravelTask(rooms)
                    break;
                }
            }
        }
    }
    
    for (var roomName of targetRoomInfo.targetRooms){
        if (Game.rooms[roomName]) continue;
        if (Memory.info.roomState[roomName] && Game.time % targetRoomInfo.checkInterval !== 0) continue;
        var home = utils.getClosetSuitableRoom(roomName,4,false);
        Game.rooms[home].AddTravelTask(roomName);
    }

    // Garbage Memory Recollection
    if (Game.time % ROOM_INFO_GARBAGE_CHECK_INTERVAL === 0) {
        for (var roomName in Memory.info.roomState){
            if (targetRoomInfo.targetRooms.indexOf(roomName) < 0 || utils.ownRoom(roomName) === true) delete Memory.info.roomState[roomName];
        }
    }
}