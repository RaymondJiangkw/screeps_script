const utils = require('utils')
module.exports = function(){
    for (var roomName of global.rooms.my){

    }
    for (var roomName of global.rooms.reserved){
        if ((_.filter(Game.rooms[roomName].enemies,(e)=>utils.analyseCreep(e.id,false,true) != "harmless")).length > 0){
            var home = utils.getClosetSuitableRoom(roomName,4,true)
            Game.rooms[home].AddDefendTask("reserved",undefined,roomName)
        }
    }
};