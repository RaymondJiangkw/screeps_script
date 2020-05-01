const utils = require('utils')
const claimedRooms = require('configuration.targetRooms').targetRooms
const reservedRooms = require('configuration.Observer').dominance
module.exports = function(){
    for (var roomName of claimedRooms){
        if (!Game.rooms[roomName] && !Memory.info.roomState[roomName]) continue;
        if (Game.rooms[roomName]) Memory.info.roomState[roomName] = utils.ownRoom(roomName);
        if (Memory.info.roomState[roomName] === "neutral") {
            var home = utils.getClosetSuitableRoom(roomName,4,true);
            if (home) Game.rooms[home].AddAttackTask("claim",roomName,utils.getSuitableRoute(home,roomName),1);
        }else if (Memory.info.roomState[roomName] === false){
            var home = utils.getClosetSuitableRoom(roomName,7,true);
            if (home) Game.rooms[home].AddAttackTask("attack",roomName,utils.getSuitableRoute(home,roomName));
        }
    }

    for (var reservedRoom of reservedRooms){
        var coordi = utils.roomNameToXY(reservedRoom)
        if (coordi[0] % 10 == 0 || coordi[1] % 10 == 0) continue;
        var home = utils.getClosetSuitableRoom(reservedRoom,4,true)
        if (home) Game.rooms[home].AddAttackTask("claim",reservedRoom,utils.getSuitableRoute(home,reservedRoom),2);
    }
};