const utils = require('utils')
const observeConfig = require('configuration.Observer')
module.exports = function() {
    for (var roomName of global.rooms.my){
        if (Game.rooms[roomName].controller.level < 4 || !Game.rooms[roomName].storage) continue
        if (!Game.rooms[roomName].observer) {
            if (observeConfig[roomName] && observeConfig[roomName].length > 0) Game.rooms[roomName].AddTravelTask("observerRooms")   
        }
        if (observeConfig["travel"][roomName]){
            for (var rooms of observeConfig["travel"][roomName]) {
                var roomList = utils.divideRoomList(rooms)
                var isTravelNeeded = false
                for (var room of roomList) {
                    if (!Game.rooms[room]){
                        isTravelNeeded = true;
                        break;
                    }
                }
                if (isTravelNeeded) Game.rooms[roomName].AddTravelTask(rooms)
            }
        }
    }
}