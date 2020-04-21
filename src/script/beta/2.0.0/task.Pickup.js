const utils = require('utils')
module.exports = function(){
    if (!global.task.pickup) global.task.pickup = {}
    for (var roomName of global.rooms.my){
        if (!global.task.pickup[roomName]) global.task.pickup[roomName] = {}
        if (!global.task.pickup[roomName].cachedExpirationTime || global.task.pickup[roomName].cachedExpirationTime <= Game.time){
            global.task.pickup[roomName].cachedExpirationTime = Game.time + utils.getCacheExpiration()
            var droppedResources = Game.rooms[roomName].find(FIND_DROPPED_RESOURCES)
            droppedResources.sort((a,b)=>b.amount - a.amount)
            for (var droppedResource of droppedResources){
                Game.rooms[roomName].AddPickUpTask(droppedResource.id,droppedResource.pos)
            }
        }
        if (Game.rooms[roomName].memory.task["pickup"]){
            for (var fingerprint of Game.rooms[roomName].memory.task["pickup"]){
                const taskInfo = Game.rooms[roomName].taskInfo(fingerprint)
                if (!Game.getObjectById(taskInfo.data.targetID)) Game.rooms[roomName].finishTask(fingerprint)
            }
        }
    }
}