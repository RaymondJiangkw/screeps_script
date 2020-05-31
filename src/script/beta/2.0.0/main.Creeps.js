const MAX_CALL_TIME = 2
const creepConfig = require('configuration.Creep')
const utils = require('utils')
const randomElement = function(array){
    return array[0];
    // return array[Math.floor(Math.random() * array.length)]
}
const treatedPorters = function(creeps){
    var _objects = _.filter(creeps,c => c.store.getFreeCapacity() > 0)
    _objects.sort((a,b)=>b.store.getFreeCapacity() - a.store.getFreeCapacity())
    return _objects
}
module.exports = function(){
    for (var roomName of global.rooms.my){
        if (Game.cpu.bucket < 100) break;
    for (var groupType in creepConfig.groupAcceptedTask){
        if (Game.cpu.bucket < 1000) {
            var allowedGroups = ["pureTransfer","pureWorker","pureRepairer","pureUpgrader","localHarvest","Defend","Claim","powerHarvest","Defend_observed"]
            if (allowedGroups.indexOf(groupType) < 0) continue;
        }
    for (var groupName in Game.rooms[roomName][groupType]){
        var creeps = Game.rooms[roomName][groupType][groupName]
        const groupRoles = Object.keys(creepConfig.groupAcceptedTask[groupType])
        const primaryCreepRole = groupRoles[0]
        for (var groupRole of groupRoles) if (!creeps[groupRole]) creeps[groupRole] = []

        for (var primaryCreep of creeps[primaryCreepRole]){
            if (primaryCreep.dying()){
                primaryCreep.memory.dying = true;
                primaryCreep.toDeath(true);
                const recycleRoleList = ["transferer"];
                const recycleGroupTypes = ["remotePickUper"];
                if (recycleGroupTypes.indexOf(primaryCreep.memory.group.type) >= 0 && recycleRoleList.indexOf(primaryCreep.memory.role) >= 0) {
                    if (primaryCreep.store.getUsedCapacity() > 0) primaryCreep["__store"]();
                    else primaryCreep.__recycle();
                }
                continue;
            }
            if (primaryCreep.memory.recycle === true) {
                if (!primaryCreep.isIdle()) primaryCreep.deleteTask();
                if (primaryCreep.store.getUsedCapacity() > 0) primaryCreep["__store"]();
                else primaryCreep.__recycle();
                continue;
            }
            if (primaryCreep.memory.storing === true) {
                if (primaryCreep.store.getUsedCapacity() > 0) primaryCreep["__store"]();
                else primaryCreep.memory.storing = false;
                continue;
            }
            if (primaryCreep.isIdle()) {
                if (primaryCreep.store.getUsedCapacity() > 0 && primaryCreep.memory.role === "transferer") primaryCreep["__store"]();
                else primaryCreep.getTask();
            }
            if (primaryCreep._boost() === OK) continue;
            if (!primaryCreep.isIdle()) {
                signals = {}
                if (groupType === "remoteHarvest"){
                    const transferCreeps = treatedPorters(creeps["transferer"]);
                    if (transferCreeps.length > 0) signals["transfer"] = transferCreeps[0].id;
                }else if (groupType === "powerHarvest"){
                    signals["transferers"] = treatedPorters(creeps["transferer"]).map(c => c.id);
                }
                var feedback = primaryCreep.run(signals)
                var cnt = 1
                while (cnt <= MAX_CALL_TIME && feedback === ERR_REPEAT) {feedback = primaryCreep.run(signals);cnt++}
                if (feedback === FINISH) primaryCreep.finishTask()
                else if (feedback === ERR_RENEW) primaryCreep.renewTask()
                else if (feedback === ERR_DELETE) primaryCreep.deleteTask()
            }else {
                const recycleRoleList = ["transferer"];
                const recycleGroupTypes = ["remotePickUper"];
                if (recycleGroupTypes.indexOf(primaryCreep.memory.group.type) >= 0 && recycleRoleList.indexOf(primaryCreep.memory.role) >= 0) {
                    if (primaryCreep.store.getUsedCapacity() > 0) primaryCreep["__store"]();
                    else primaryCreep.__recycle();
                }else primaryCreep.Invisible();
            }
        }

        for (var i = 1; i < groupRoles.length;i++){
        const servantCreepRole = groupRoles[i]
        for (var creep of creeps[servantCreepRole]){
            const randomPrimaryCreep = randomElement(creeps[primaryCreepRole])
            let reSpawn = false;
            if (!randomPrimaryCreep) {
                var checkRespawn = function (t) {
                    var memory = Game.rooms[creep.memory.home].taskInfo(t).data.memory;
                    return memory.role === primaryCreepRole && memory.group.type === creep.memory.group.type && memory.group.name === creep.memory.group.name;
                }
                const isReSpawn = _.filter(Game.rooms[creep.memory.home].searchTask("_spawn","default"),checkRespawn);
                if (isReSpawn.length > 0) reSpawn = true
            }
            
            if (creep.dying()){
                creep.memory.dying = true
                if (reSpawn || (randomPrimaryCreep && (!randomPrimaryCreep.isIdle() || randomPrimaryCreep.getTask(true)) )  ) creep.toDeath(false,true);
                else creep.toDeath(false,false);
                continue;
            }
            if (creep.memory.recycle === true) {
                if (!creep.isIdle()) creep.deleteTask();
                creep.__recycle();
                continue;
            }
            if (creep.memory.storing === true) {
                if (creep.store.getUsedCapacity() > 0) creep.__store();
                else creep.memory.storing = false;
                continue;
            }
            if (!randomPrimaryCreep && reSpawn) {
                creep.deleteTask();
                if (creep.store.getUsedCapacity() > 0) creep["__store"]();
                else creep.Invisible();
                continue;
            }
            if (!randomPrimaryCreep && !reSpawn) {
                if (creep.store.getUsedCapacity() > 0) creep["__store"]();
                else if (creep["__recycle"]() !== OK) creep.suicide();
                continue;
            }
            if (creep._boost() === OK) continue
            if (creep.isIdle() && randomPrimaryCreep.isIdle()) {creep.Invisible();continue;}
                        
            if (creep.isIdle()){
                var primaryTaskInfo = Game.rooms[creep.memory.home].taskInfo(randomPrimaryCreep.memory.taskFingerprint)
                var taskList = utils.analyseTaskList(creepConfig.groupAcceptedTask[groupType][creep.memory.role][0])
                var mainTask = taskList[0], subTask = taskList[1][0]
                if (mainTask === "attack"){
                    if (subTask === "heal"){
                        var fingerprint = Game.rooms[creep.memory.home].AddAttackTask(subTask,"creep",primaryTaskInfo.data.targetRoom,primaryTaskInfo.data.routes,Infinity,false,true,true);
                        if (fingerprint) creep.memory.taskFingerprint = fingerprint
                    }
                }else if (mainTask === "transfer"){
                    if (subTask === "remote"){
                        var from, fromRoom
                        if (groupType === "remoteHarvest") from = "creep"

                        if (from === "creep") fromRoom = primaryTaskInfo.data.targetPos["roomName"]
                        var fingerprint = Game.rooms[creep.memory.home].AddTransferTask(subTask,{target:from,roomName:fromRoom},{target:Game.rooms[creep.memory.home].storage.id,roomName:creep.memory.home},undefined,"full",{changeable:false,getRepeat:true,silence:true});

                        if (fingerprint) creep.memory.taskFingerprint = fingerprint
                    }
                }
            }

            if (!creep.isIdle()){
                var signals = {}
                signals["creep"] = randomPrimaryCreep.id;
                if (randomPrimaryCreep.isIdle() && !randomPrimaryCreep.dying()) signals["finish"] = true;
                var feedback = creep.run(signals)
                var cnt = 1
                while (cnt <= MAX_CALL_TIME && feedback === ERR_REPEAT) {feedback = creep.run(signals);cnt++;}
                if (feedback === FINISH) creep.finishTask()
                else if (feedback === ERR_RENEW) creep.renewTask()
                else if (feedback === ERR_DELETE) creep.deleteTask()
            }else creep.Invisible()
        }
    }
    }
    }
    }
}