const utils = require('utils')
const repairConfig = require('configuration.Repair')
const hitsCompare = function(objectA,objectB) {
    return objectA.hits/objectA.hitsMax - objectB.hits/objectB.hitsMax
}
module.exports = function(){
    if (!global.task.repair) global.task.repair = {}
    for (var roomName of global.rooms.my){
        if (!global.task.repair[roomName]) global.task.repair[roomName] = {}
        if (!global.task.repair[roomName].cachedExpirationTime || global.task.repair.repair[roomName].cachedExpirationTime <= Game.time){
            global.task.repair[roomName].cachedExpirationTime = utils.getCacheExpiration(100) + Game.time
            var cores = [].concat(Game.rooms[roomName].spawns,
                                 Game.rooms[roomName].powerSpawn,
                                 Game.rooms[roomName].extensions,
                                 Game.rooms[roomName].towers,
                                 Game.rooms[roomName].labs,
                                 Game.rooms[roomName].factory,
                                 Game.rooms[roomName].terminal,
                                 Game.rooms[roomName].storage,
                                 Game.rooms[roomName].extractor,
                                 Game.rooms[roomName].observer,
                                 Game.rooms[roomName].links)
            cores = _.filter(cores,(s)=>s.hits < s.hitsMax)
            var roads = _.filter(Game.rooms[roomName].roads,(r)=>r.hits < r.hitsMax)
            var containers = _.filter(Game.rooms[roomName].containers,(c)=>c.hits < c.hitsMax)
            var repairTargets = [].concat(cores,roads,containers)
            if (repairConfig[roomName]) {
                var ramparts = _.filter(Game.rooms[roomName].ramparts,r=>r.hits < r.hitsMax)
                var walls = _.filter(Game.rooms[roomName].walls,w=>w.hits < w.hitsMax)
                repairTargets = repairTargets.concat(ramparts,walls)
            }
            repairTargets.sort(hitsCompare)
            for (var repairTarget of repairTargets){
                Game.rooms[roomName].AddRepairTask(repairTarget.id,repairTarget.pos)
            }
        }
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
                Game.rooms[home].AddRepairTask(repairTarget.id,repairTarget.pos)
            }
        }
        
    }
}