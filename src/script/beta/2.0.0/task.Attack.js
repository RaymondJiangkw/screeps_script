const utils = require('utils')
const claimedRooms = require('configuration.targetRooms')
const reservedRooms = require('configuration.Observer').dominance
module.exports = function(){
    for (var reservedRoom of reservedRooms){
        var coordi = utils.roomNameToXY(reservedRoom)
        if (coordi[0] % 10 == 0 || coordi[1] % 10 == 0 || utils.ownRoom(reservedRoom) == "reserved") continue
        var home = utils.getClosetSuitableRoom(reservedRoom,4,true)
        if (home) Game.rooms[home].AddAttackTask("claim",reservedRoom,undefined,[],2,false)
    }
};