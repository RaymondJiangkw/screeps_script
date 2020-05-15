const utils = require('utils')
const remoteCentralRooms = require('configuration.Observer').coreDominance;
const constants = require('constants');
module.exports = function(){
    for (var roomName of global.rooms.observed){
        if (_.filter(Game.rooms[roomName].enemies,(c)=>constants.enemies.indexOf(c.owner.username) >= 0).length > 0) {
            var home = utils.getClosetSuitableRoom(roomName,8,true);
            if (!home) continue;
            //Game.rooms[home].AddDefendTask("observed",roomName);
        }
    }
    for (var roomName of global.rooms.reserved){
        if ((_.filter(Game.rooms[roomName].enemies,(e)=>utils.analyseCreep(e,false,true) !== "harmless")).length > 0 || Game.rooms[roomName].hostileStructures.length > 0){
            var home = utils.getClosetSuitableRoom(roomName,7,true)
            if (!home) continue;
            Game.rooms[home].AddDefendTask("reserved",roomName);
        }
    }
    for (var roomName of global.rooms.central){
        if (roomName in remoteCentralRooms){
            const enemies = _.filter(Game.rooms[roomName].enemies,(c)=>utils.Adjacent(c,_.map(remoteCentralRooms[roomName],Game.getObjectById),3));
            if (enemies.length > 0){
                var home = utils.getClosetSuitableRoom(roomName,7,true);
                if (!home) continue;
                Game.rooms[home].AddDefendTask("central",roomName);
            }
        }
    }
};