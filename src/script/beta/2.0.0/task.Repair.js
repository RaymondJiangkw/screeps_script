const utils = require('utils')
const repairConfig = require('configuration.Repair')
const hitsCompare = function(objectA,objectB) {
    return objectA.hits/objectA.hitsMax - objectB.hits/objectB.hitsMax
}
module.exports = function(){
    if (!global.task.repair) global.task.repair = {}
    for (var roomName of global.rooms.my){
        if (Game.rooms[roomName].repairTargets.length > 0) Game.rooms[roomName].AddRepairTask("local","repair")
    }
    for (var roomName of global.rooms.observed) {
        if (Game.rooms[roomName].controller && Game.rooms[roomName].controller.owner) continue
        if (!repairConfig[roomName]) continue
        if (!global.task.repair[roomName]) global.task.repair[roomName] = {}
        if (!global.task.repair[roomName].cachedExpirationTime || global.task.repair[roomName].cachedExpirationTime <= Game.time){
            global.task.repair[roomName].cachedExpirationTime = utils.getCacheExpiration(100) + Game.time
            var roads = _.filter(Game.rooms[roomName].roads,(r)=>r.hits < r.hitsMax)
            var containers = _.filter(Game.rooms[roomName].containers,(c)=>c.hits < c.hitsMax)
            var repairTargets = [].concat(roads,containers)
            repairTargets.sort(hitsCompare)
            var home = utils.getClosetSuitableRoom(roomName,7)
            for (var repairTarget of repairTargets){
                Game.rooms[home].AddRepairTask("remote",repairTarget.id,repairTarget.pos)
            }
        }
        
    }
}