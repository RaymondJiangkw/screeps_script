const creepConfig = require('configuration.Creep')
const subTaskType = function(roomName,fingerprint){
    return Game.rooms[roomName].memory.task.info[fingerprint].subTaskType
}
const generateSpawnTask = function(roomName,groupType){
    if (!Game.rooms[roomName].memory.spawnCnt) Game.rooms[roomName].memory.spawnCnt = {}
    if (!Game.rooms[roomName].memory.spawnCnt[groupType]) Game.rooms[roomName].memory.spawnCnt[groupType] = 0
    var groupName = groupType + "_" + roomName + "_" + Game.rooms[roomName].memory.spawnCnt[groupType]
    for (var role in creepConfig.groupAcceptedTask[groupType]){
        var boostCompounds = creepConfig.boosts[role]
        if (!boostCompounds) boostCompounds = []
        if (Game.rooms[roomName].AddSpawnTask(role,creepConfig.components[role],groupType,groupName,boostCompounds)) Game.rooms[roomName].memory.spawnCnt[groupType]++;
    }
}
module.exports = function(){
    for (var roomName of global.rooms.my){
        var creepsCollection = _.groupBy(Game.rooms[roomName].creeps,(c)=>c.memory.role)
        for (var role in creepConfig.components) if (!creepsCollection[role]) creepsCollection[role] = []
        for (var waitingSpawnTask of Game.rooms[roomName].searchTask("spawn","default")) {
            const taskInfo = Game.rooms[roomName].taskInfo(waitingSpawnTask)
            const simulateCreep = {memory:taskInfo.data.memory}
            creepsCollection[taskInfo.data.memory.role].push(simulateCreep)
        }
        
        // Transfer Task
        const pureTransferer = _.filter(creepsCollection["transferer"],(c)=>c.memory.group.type === "pureTransfer")
        const remoteTransfer = _.filter(creepsCollection["transferer"],(c)=>c.memory.group.type === "remoteTransfer")
        var transferTaskLength = Game.rooms[roomName].countTask("_transfer",["core","defense","advanced"])
        var aidTaskLength = Game.rooms[roomName].countTask("_transfer",["aid"])
        if (Game.rooms[roomName].memory.task["transfer"] && (pureTransferer.length === 0 || pureTransferer.length < Math.floor(Math.log(transferTaskLength)))) generateSpawnTask(roomName,"pureTransfer");
        if (remoteTransfer.length < aidTaskLength) generateSpawnTask(roomName,"remoteTransfer")

        // Harvest Task
        if (Game.rooms[roomName].memory.task["harvest"] && creepsCollection["harvester"].length < Game.rooms[roomName].memory.task["_harvest"].length){
            for (var fingerprint of Game.rooms[roomName].memory.task["harvest"]){
                var groupType = undefined
                if (subTaskType(roomName,fingerprint) === "remote") groupType = "remoteHarvest"
                else if (subTaskType(roomName,fingerprint) === "local") groupType = "localHarvest"
                generateSpawnTask(roomName,groupType)
            }
        }
        
        // Upgrade Task
        if (Game.rooms[roomName].memory.task["upgrade"] && creepsCollection["upgrader"].length === 0) generateSpawnTask(roomName,"pureUpgrader");
        
        // Defend Task
        const roomDefendCnt = Game.rooms[roomName].countTask("_defend",["local","reserved"])
        if (creepsCollection["defender"].length < roomDefendCnt) generateSpawnTask(roomName,"Defend");
        
        // Build Task
        if (Game.rooms[roomName].memory.task["build"] && Game.rooms[roomName].memory.task["build"].length > 0 && creepsCollection["worker"].length === 0) generateSpawnTask(roomName,"pureWorker");
        
        // Repair Task
        if (Game.rooms[roomName].memory.task["repair"]){
            var remoteRepairCnt = Game.rooms[roomName].countTask("_repair",["remote"])
            var localRepairCnt = Game.rooms[roomName].countTask("_repair",["local"])
            const pureRepairer = _.filter(creepsCollection["repairer"],(c)=>c.memory.group.type === "pureRepairer")
            const remoteRepairer = _.filter(creepsCollection["repairer"],(c)=>c.memory.group.type === "remoteRepairer")
            if (remoteRepairer.length < remoteRepairCnt) generateSpawnTask(roomName,"remoteRepairer");
            if (localRepairCnt > 0 && pureRepairer.length === 0) generateSpawnTask(roomName,"pureRepairer");
        }

        // Travel Task
        if (Game.rooms[roomName].memory.task["travel"] && creepsCollection["traveler"].length < Game.rooms[roomName].memory.task["_travel"].length) generateSpawnTask(roomName,"Travel")

        // Attack Task
        if (Game.rooms[roomName].memory.task["attack"] && creepsCollection["attacker"].length + Math.floor(creepsCollection["claimer"].length / 2) < Game.rooms[roomName].memory.task["_attack"].length){
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