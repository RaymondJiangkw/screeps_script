const utils = require('utils')
const remoteCentralRooms = require('configuration.Observer').coreDominance
module.exports = function(){
    for (var roomName of global.rooms.my){
        
    }
    for (var roomName of global.rooms.reserved){
        if ((_.filter(Game.rooms[roomName].enemies,(e)=>utils.analyseCreep(e,false,true) !== "harmless")).length > 0){
            var home = utils.getClosetSuitableRoom(roomName,7,true)
            Game.rooms[home].AddDefendTask("reserved",roomName);
        }
    }
    for (var roomName of global.rooms.central){
        if (roomName in remoteCentralRooms){
            const enemies = _.filter(Game.rooms[roomName].enemies,(c)=>utils.Adjacent(c,_.map(remoteCentralRooms[roomName],Game.getObjectById),3));
            if (enemies.length > 0){
                var home = utils.getClosetSuitableRoom(roomName,7,true)
                Game.rooms[home].AddDefendTask("central",roomName);
            }
        }
    }
};