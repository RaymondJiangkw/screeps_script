const utils = require('utils')
const remoteEnergyRooms = require('configuration.Observer').utilsEnergy
const remoteCentralRooms = require('configuration.Observer').coreDominance
module.exports = function() {
    for (var roomName of global.rooms.my) {
        var cachedResources = Object.keys(global.containers[roomName].map)
        if (cachedResources.length > 0){
            for (var resourceId of cachedResources){
                var cachedResource = Game.getObjectById(resourceId)

                var resourceMineralType = cachedResource.mineralType
                if (resourceMineralType && (!Game.rooms[roomName].extractor || cachedResource.mineralAmount === 0)) continue

                Game.rooms[roomName].AddHarvestTask("local",cachedResource.id,cachedResource.pos)
            }
        }else{
            var homeTarget = Game.rooms[roomName].controller
            if (Game.rooms[roomName].spawns.length > 0) homeTarget = Game.rooms[roomName].spawns[0]

            var energyTarget = homeTarget.pos.findClosestByRange(FIND_SOURCES_ACTIVE)
            if (energyTarget) Game.rooms[roomName].AddHarvestTask("local",energyTarget.id,energyTarget.pos)
        }
    }
    for (var roomName of global.rooms.observed) {
        const deposits = ["mists","biomasss","metals","silicons"]
        for (var depositType of deposits){
            var home = utils.getClosetSuitableRoom(roomName,6,true)
            if (!home) break
            for (var deposit of Game.rooms[roomName][depositType]){
                if (!deposit) continue;
                if (deposit.lastCooldown >= utils.getAcceptableCoolTime(home,roomName)) continue
                Game.rooms[home].AddHarvestTask("remote",deposit.id,deposit.pos)
            }
        }
        for (var powerBank of Game.rooms[roomName]["powerBanks"]){
            if (!powerBank) continue;
            if (powerBank.power < 5000 || powerBank.ticksToDecay < 4500) continue;
            var home = utils.getClosetSuitableRoom(roomName,8,true)
            if (!home) break
            Game.rooms[home].AddAttackTask("harvest",powerBank.id,roomName,utils.getSuitableRoute(home,roomName),1)
        }
    }
    for (var roomName of remoteEnergyRooms) {
        if (utils.ownRoom(roomName) !== "reserved") continue
        var home = utils.getClosetSuitableRoom(roomName,4,true)
        if (!home) continue
        var sources = Game.rooms[roomName].find(FIND_SOURCES_ACTIVE)
        for (var source of sources) if (source.energy > 0) Game.rooms[home].AddHarvestTask("remote",source.id,source.pos)
    }
    for (var roomName in remoteCentralRooms){
        if (!Game.rooms[roomName]) continue;
        const enemies = _.filter(Game.rooms[roomName].enemies,(c)=>utils.Adjacent(c,_.map(remoteCentralRooms[roomName],Game.getObjectById),3));
        if (enemies.length > 0) continue;
        var home = utils.getClosetSuitableRoom(roomName,7,true)
        if (!home) continue
        for (var resourceID of remoteCentralRooms[roomName]){
            var resource = Game.getObjectById(resourceID);
            if (resource.energy === 0 || resource.mineralAmount === 0) continue;
            Game.rooms[home].AddHarvestTask("remote",resourceID,resource.pos);
        }
    }
}