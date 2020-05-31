const utils = require('utils')
const remoteEnergyRooms = require('configuration.Observer').utilsEnergy
const remoteCentralRooms = require('configuration.Observer').coreDominance
const constants = require('constants')
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
        if (_.filter(Game.rooms[roomName].enemies,c => constants.enemies.indexOf(c.owner.username) >= 0).length > 0) continue;
        for (var depositType of deposits){
            var home = utils.getClosetSuitableRoom(roomName,6,true,false,["W21N24"])
            if (!home) break
            for (var deposit of Game.rooms[roomName][depositType]){
                if (!deposit) continue;
                if (deposit.lastCooldown >= utils.getAcceptableCoolTime(home,roomName)) continue
                Game.rooms[home].AddHarvestTask("remote",deposit.id,deposit.pos)
            }
        }
        for (var powerBank of Game.rooms[roomName]["powerBanks"]){
            if (!powerBank) continue;
            if (powerBank.power < 3000 || powerBank.ticksToDecay < 4500) continue;
            var home = utils.getClosetSuitableRoom(roomName,8,true)
            if (!home || Game.rooms[home].energyAvailable !== Game.rooms[home].energyCapacityAvailable || Game.cpu.bucket < 9000) break;
            if (Game.map.getRoomLinearDistance(home,roomName) > 3) break;
            var harvestTaskLength = Game.rooms[home].countTask("_attack",["harvest"]);
            if (harvestTaskLength > 0) break;
            Game.rooms[home].AddAttackTask("harvest",powerBank.id,roomName,utils.getSuitableRoute(home,roomName),1)
        }
    }
    for (var roomName of remoteEnergyRooms) {
        if (utils.ownRoom(roomName) === false) continue
        if (!Game.rooms[roomName]) continue;
        var home = utils.getClosetSuitableRoom(roomName,4,true)
        if (!home) continue
        for (var source of Game.rooms[roomName].energys) Game.rooms[home].AddHarvestTask("remote",source.id,source.pos)
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