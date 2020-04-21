const spawnConfig = require('configuration.Spawn')
module.exports = function(){
    for (var roomName of global.rooms.my){
        for (var spawn of Game.rooms[roomName].spawns){
            if (!spawn.memory.lastSpawningTick) spawn.memory.lastSpawningTick = Game.time - spawnConfig.spawnIntervalTick
            if (!spawn.isIdle()) spawn.run()
            if (spawn.memory.lastSpawningTick + spawnConfig.spawnIntervalTick <= Game.time){
                if (spawn.isIdle()) if(spawn.getTask()) spawn.memory.lastSpawningTick = Game.time
            }
        }
    }
}