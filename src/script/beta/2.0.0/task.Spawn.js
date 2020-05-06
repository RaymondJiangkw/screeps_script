const utils = require('utils')
const creepConfig = require('configuration.Creep')
const generateSpawnTask = function(roomName,groupType){
    if (!Game.rooms[roomName].memory.spawnCnt) Game.rooms[roomName].memory.spawnCnt = {}
    if (!Game.rooms[roomName].memory.spawnCnt[groupType]) Game.rooms[roomName].memory.spawnCnt[groupType] = 0
    var executable = true
    var groupName = groupType + "_" + roomName + "_" + Game.rooms[roomName].memory.spawnCnt[groupType]
    for (var role in creepConfig.groupAcceptedTask[groupType]){
        var saltArr = utils.getSaltList(roomName,groupType,groupName,role)
        var roleNum = 1
        var boostCompounds = utils.getBoosts(role,groupType)
        if (creepConfig.groupSpawnConfig[groupType] !== undefined && creepConfig.groupSpawnConfig[groupType][role] !== undefined) roleNum = creepConfig.groupSpawnConfig[groupType][role]
        for (var _ = 0; _ < roleNum;_++){
            if (saltArr.indexOf(_) >= 0) continue
            if (!Game.rooms[roomName].AddSpawnTask(role,creepConfig.components[role],groupType,groupName,boostCompounds,_)) executable = false;
        }
    }
    if (executable) Game.rooms[roomName].memory.spawnCnt[groupType]++;
}
module.exports = function(){
    for (var roomName of global.rooms.my){
        var creepsCollection = utils.getAllCreeps(roomName);
        
        // Transfer Task
        const pureTransferer = _.filter(creepsCollection["transferer"],(c)=>c.memory.group.type === "pureTransfer")
        const remoteTransferer = _.filter(creepsCollection["transferer"],(c)=>c.memory.group.type === "remoteTransfer")
        var transferTaskLength = Game.rooms[roomName].countTask("_transfer",["core","defense","advanced","limit"]);
        var aidTaskLength = Game.rooms[roomName].countTask("_transfer",["aid"]);
        if (pureTransferer.length === 0 || pureTransferer.length < Math.floor(Math.log(transferTaskLength))) generateSpawnTask(roomName,"pureTransfer");
        if (remoteTransferer.length < aidTaskLength) generateSpawnTask(roomName,"remoteTransfer");

        // Harvest Task
        const localHarvester = _.filter(creepsCollection["harvester"],(c)=>c.memory.group.type === "localHarvest")
        const remoteHarvester = _.filter(creepsCollection["harvester"],(c)=>c.memory.group.type === "remoteHarvest")
        var localHarvestTaskLength = Game.rooms[roomName].countTask("_harvest",["local"])
        var remoteHarvestTaskLength = Game.rooms[roomName].countTask("_harvest",["remote"])
        if (localHarvestTaskLength > localHarvester.length) generateSpawnTask(roomName,"localHarvest")
        if (remoteHarvestTaskLength > remoteHarvester.length) generateSpawnTask(roomName,"remoteHarvest")
        
        // Upgrade Task
        const Upgrader = creepsCollection["upgrader"]
        const upgradeTaskLength = Game.rooms[roomName].countTask("_upgrade",["all"])
        if (Upgrader.length < upgradeTaskLength) generateSpawnTask(roomName,"pureUpgrader");
        
        // Defend Task
        const Defender = creepsCollection["defender"]
        const roomDefendCnt = Game.rooms[roomName].countTask("_defend",["local","reserved","central"])
        if (Defender.length < roomDefendCnt) generateSpawnTask(roomName,"Defend");
        
        // Build Task
        const Worker = creepsCollection["worker"]
        const workTaskLength = Game.rooms[roomName].countTask("_build",["all"]);
        if (Worker.length < workTaskLength) generateSpawnTask(roomName,"pureWorker");
        
        // Repair Task
        var remoteRepairCnt = Game.rooms[roomName].countTask("_repair",["remote"])
        var localRepairCnt = Game.rooms[roomName].countTask("_repair",["local"])
        const pureRepairer = _.filter(creepsCollection["repairer"],(c)=>c.memory.group.type === "pureRepairer")
        const remoteRepairer = _.filter(creepsCollection["repairer"],(c)=>c.memory.group.type === "remoteRepairer")
        if (remoteRepairer.length < remoteRepairCnt) generateSpawnTask(roomName,"remoteRepairer");
        if (localRepairCnt > 0 && pureRepairer.length === 0) generateSpawnTask(roomName,"pureRepairer");

        // Travel Task
        const Traveler = creepsCollection["traveler"]
        const travelTaskLength = Game.rooms[roomName].countTask("_travel",["all"]);
        if (Traveler.length < travelTaskLength) generateSpawnTask(roomName,"Travel")

        // Attack Task
        var attackTaskLength = Game.rooms[roomName].countTask("_attack",["attack"])
        var harvestTaskLength = Game.rooms[roomName].countTask("_attack",["harvest"])
        var claimTasks = Game.rooms[roomName].searchTask("attack",["claim"])
        var claimTaskLength = 0;
        for (var claimTask of claimTasks){
            var taskInfo = Game.rooms[roomName].taskInfo(claimTask);
            claimTaskLength += taskInfo.settings.allGroupsNum;
        }

        var attackerAttack = _.filter(creepsCollection["attacker"],(c)=>c.memory.group.type === "Attack");
        var attackerHarvest = _.filter(creepsCollection["attacker"],(c)=>c.memory.group.type === "powerHarvest");

        if (attackerAttack.length < attackTaskLength) generateSpawnTask(roomName,"Attack")
        if (attackerHarvest.length < harvestTaskLength) generateSpawnTask(roomName,"powerHarvest")
        if (claimTaskLength > creepsCollection["claimer"].length) generateSpawnTask(roomName,"Claim")

        // PickUp Task
        const remotePickUper = _.filter(creepsCollection["transferer"],(c)=>c.memory.group.type === "remotePickUper")
        const remotePickUpTaskLength = Game.rooms[roomName].countTask("_pickup",["remote"])
        const remoteTransferTaskLength = Game.rooms[roomName].countTask("_transfer",["remote"])
        if (remotePickUper.length < remotePickUpTaskLength + remoteTransferTaskLength) generateSpawnTask(roomName,"remotePickUper")
    }
}