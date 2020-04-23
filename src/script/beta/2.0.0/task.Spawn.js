const creepConfig = require('configuration.Creep')
const subTaskType = function(roomName,fingerprint){
    return Game.rooms[roomName].memory.task.info[fingerprint].subTaskType
}
const generateSpawnTask = function(roomName,groupType){
    var groupName = groupType + "_" + roomName + "_" + Game.time
    for (var role in creepConfig.groupAcceptedTask[groupType]){
        var boostCompounds = creepConfig.boosts[role]
        if (!boostCompounds) boostCompounds = []
        Game.rooms[roomName].AddSpawnTask(role,creepConfig.components[role],groupType,groupName,boostCompounds)
    }
}
module.exports = function(){
    for (var roomName of global.rooms.my){
        var creepsCollection = _.groupBy(Game.rooms[roomName].creeps,(c)=>c.memory.role)
        for (var role in creepConfig.components){
            if (!creepsCollection[role]) creepsCollection[role] = []
        }
        // Harvest Task
        if (Game.rooms[roomName].memory.task["harvest"] && creepsCollection["harvester"].length < Game.rooms[roomName].memory.task["_harvest"].length){
            for (var fingerprint of Game.rooms[roomName].memory.task["harvest"]){
                var groupType = undefined
                if (subTaskType(roomName,fingerprint) === "remote") groupType = "remoteHarvest"
                else if (subTaskType(roomName,fingerprint) === "local") groupType = "localHarvest"
                generateSpawnTask(roomName,groupType)
            }
        }
        
        // Transfer Task
        const pureTransferer = _.filter(creepsCollection["transferer"],(c)=>c.memory.group.type === "pureTransfer")
        if (Game.rooms[roomName].memory.task["transfer"] && pureTransferer.length === 0) generateSpawnTask(roomName,"pureTransfer");
        
        // Upgrade Task
        if (Game.rooms[roomName].memory.task["upgrade"] && creepsCollection["upgrader"].length === 0) generateSpawnTask(roomName,"pureUpgrader");
        
        // Defend Task
        if (Game.rooms[roomName].memory.task["defend"] && creepsCollection["defender"].length < Game.rooms[roomName].memory.task["_defend"].length) generateSpawnTask(roomName,"Defend");
        
        // Build Task
        if (Game.rooms[roomName].memory.task["build"] && Game.rooms[roomName].memory.task["build"].length > 0 && creepsCollection["worker"].length === 0) generateSpawnTask(roomName,"pureWorker");
        
        // Repair Task
        if (Game.rooms[roomName].memory.task["repair"]){
            var remoteRepairCnt = 0;
            var localRepairCnt = 0;
            for (var fingerprint of Game.rooms[roomName].memory.task["repair"]){
                var _subTaskType = subTaskType(roomName,fingerprint)
                if (_subTaskType === "remote") remoteRepairCnt++;
                if (_subTaskType === "local") localRepairCnt++;
            }
            const pureRepairer = _.filter(creepsCollection["repairer"],(c)=>c.memory.group.type === "pureRepairer")
            const remoteRepairer = _.filter(creepsCollection["repairer"],(c)=>c.memory.group.type === "remoteRepairer")
            if (remoteRepairCnt > 0 && remoteRepairer.length === 0) generateSpawnTask(roomName,"remoteRepairer");
            if (localRepairCnt > 0 && pureRepairer.length === 0) generateSpawnTask(roomName,"pureRepairer");
        }

        // Travel Task
        if (Game.rooms[roomName].memory.task["travel"] && creepsCollection["traveler"].length < Game.rooms[roomName].memory.task["_travel"].length) generateSpawnTask(roomName,"Travel")

        // Attack Task
        if (Game.rooms[roomName].memory.task["attack"] && creepsCollection["attacker"].length < Game.rooms[roomName].memory.task["_attack"].length){
            for (var fingerprint of Game.rooms[roomName].memory.task["attack"]){
                var groupType = undefined
                if (subTaskType(roomName,fingerprint) === "attack") groupType = "Attack"
                else if (subTaskType(roomName,fingerprint) === "harvest") groupType = "powerHarvest"
                else if (subTaskType(roomName,fingerprint) === "claim") groupType = "Claim"
                generateSpawnTask(roomName,groupType)
            }
        }
    }
}