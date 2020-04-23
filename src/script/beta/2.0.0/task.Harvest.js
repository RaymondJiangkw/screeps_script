const utils = require('utils')
module.exports = function() {
    for (var roomName of global.rooms.my) {
        var cachedResources = Object.keys(global.containers[roomName].map)
        if (cachedResources.length > 0){
            for (var resourceId of cachedResources){
                var cachedResource = Game.getObjectById(resourceId)

                var resourceMineralType = cachedResource.mineralType
                if (resourceMineralType && !Game.rooms[roomName].extractor) continue

                Game.rooms[roomName].AddHarvestTask("local",cachedResource.id,cachedResource.pos,)
            }
        }else{
            var homeTarget = Game.rooms[roomName].controller
            if (Game.rooms[roomName].spawns.length > 0) homeTarget = Game.rooms[roomName].spawns[0]

            var energyTarget = homeTarget.pos.findClosestByRange(FIND_SOURCES_ACTIVE)
            if (energyTarget) Game.rooms[roomName].AddHarvestTask("local",energyTarget.id,energyTarget.pos,)
        }
    }
    for (var roomName of global.rooms.observed) {
        const deposits = ["mists","biomasss","metals","silicons"]
        for (var depositType of deposits){
            var home = utils.getClosetSuitableRoom(roomName,4,haveStorage = true)
            if (!home) break
            for (var deposit of Game.rooms[roomName][depositType]){
                Game.rooms[home].AddHarvestTask("remote",deposit.id,deposit.pos)
            //    Game.rooms[home].AddTransferTask("remote","creep",Game.rooms[home].storage.id,depositType.substring(0,depositType.length-1),Infinity,1,false)
            }
        }
        for (var powerBank of Game.rooms[roomName]["powerBanks"]){
            var home = utils.getClosetSuitableRoom(roomName,6,haveStorage = true)
            if (!home) break
            Game.rooms[home].AddAttackTask("harvest",roomName,powerBank.id,1)
        //    Game.rooms[home].AddAttackTask("heal",roomName,"creep",1)
        //    Game.rooms[home].AddTransferTask("remote","creep",Game.rooms[home].storage.id,RESOURCE_POWER,powerBank.power,5,false)
        }
    }
}