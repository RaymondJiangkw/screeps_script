const spawnConfig = require('configuration.Spawn')
module.exports = function(){
    for (var roomName of global.rooms.my){
        for (var spawn of Game.rooms[roomName].spawns){
            if (!spawn.memory.lastSpawningTick) spawn.memory.lastSpawningTick = Game.time - spawnConfig.spawnIntervalTick
            if (!spawn.memory.protection && global.unexpectedDeath[roomName] >= spawnConfig.vigilantDeathToll) {
                global.unexpectedDeath[roomName] = 0
                spawn.activateProtection()
            }
            var lock = false
            if (spawn.memory.lastSpawningTick + spawnConfig.spawnIntervalTick <= Game.time){
                if (spawn.isIdle()) if(spawn.getTask()) {
                    spawn.memory.lastSpawningTick = Game.time
                    lock = true
                }
            }
            if (!spawn.isIdle()) spawn.run()
            if (lock) break
        }
    }
}