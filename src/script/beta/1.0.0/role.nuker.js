const reference = require("reference")
const helpFunc = require("func")
const task = require("task.general")
const roleNuker = {
    run:function(roomName){
        const nuker = Game.getObjectById(Game.spawns['Origin'].memory.init.access.nukers[roomName][0])
        if (reference.defense.settings.fillNuker && nuker.store.getFreeCapacity(RESOURCE_GHODIUM) !== 0){
            if (helpFunc.isCompoundEnough(roomName,RESOURCE_GHODIUM,nuker.store.getFreeCapacity(RESOURCE_GHODIUM))){
                task.addTransfer(roomName,"nuker",RESOURCE_GHODIUM,nuker.store.getFreeCapacity(RESOURCE_GHODIUM))
            }
        }
    }
}
module.exports = roleNuker