const FINISH = "finish"
const ERR_RENEW = "renew"
const ERR_DELETE = "delete"
const ERR_REPEAT = "repeat"
const MAX_CALL_TIME = 2
const creepConfig = require('configuration.Creep')
const utils = require('utils')
const randomElement = function(array){
    return array[Math.floor(Math.random() * array.length)]
}
const treatedPorters = function(creeps){
    var _objects = _.filter(creeps,c => c.store.getFreeCapacity() > 0)
    _objects.sort((a,b)=>b.store.getFreeCapacity() - a.store.getFreeCapacity())
    return _objects
}
module.exports = function(){
    for (var roomName of global.rooms.my){
    for (var groupType in creepConfig.groupAcceptedTask){
    for (var groupName in Game.rooms[roomName][groupType]){
        var creeps = Game.rooms[roomName][groupType][groupName]
        const groupRoles = Object.keys(creepConfig.groupAcceptedTask[groupType])
        const primaryCreepRole = groupRoles[0]
        for (var groupRole of groupRoles) if (!creeps[groupRole]) creeps[groupRole] = []

        for (var primaryCreep of creeps[primaryCreepRole]){
            if (primaryCreep.dying()){
                primaryCreep.memory.dying = true;
                primaryCreep.toDeath(true);
                continue;
            }
            if (primaryCreep.isIdle()) primaryCreep.getTask();
            if (primaryCreep._boost() === OK) continue;
            if (!primaryCreep.isIdle()) {
                signals = {}
                if (groupType === "remoteHarvest"){
                    const transferCreeps = treatedPorters(creeps["transferer"]);
                    if (transferCreeps.length > 0) signals["transfer"] = transferCreeps[0].id;
                    signals["transferers"] = transferCreeps;
                }
                var feedback = primaryCreep.run(signals)
                var cnt = 1
                while (cnt <= MAX_CALL_TIME && feedback === ERR_REPEAT) {primaryCreep.run(signals);cnt++}
                if (feedback === FINISH) primaryCreep.finishTask()
                else if (feedback === ERR_RENEW) primaryCreep.renewTask()
                else if (feedback === ERR_DELETE) primaryCreep.deleteTask()
            }else primaryCreep.Invisible()
        }

        for (var i = 1; i < groupRoles.length;i++){
        const servantCreepRole = groupRoles[i]
        for (var creep of creeps[servantCreepRole]){
            const randomPrimaryCreep = randomElement(creeps[primaryCreepRole])
            if (creep.dying()){
                let reSpawn = false;
                if (!randomPrimaryCreep) {
                    var checkRespawn = function (t) {
                        var memory = Game.rooms[creep.memory.home].taskInfo(t).data.memory;
                        return memory.role === primaryCreepRole && memory.group.type === creep.memory.group.type && memory.group.name === creep.memory.group.name;
                    }
                    const isReSpawn = _.filter(Game.rooms[creep.memory.home].searchTask("_spawn","default"),checkRespawn);
                    if (isReSpawn.length > 0) reSpawn = true
                }
                creep.memory.dying = true
                if (reSpawn || (randomPrimaryCreep && (!randomPrimaryCreep.isIdle() || randomPrimaryCreep.getTask(true)) )  ) creep.toDeath(false,true);
                else creep.toDeath(false,false);
                continue;
            }

            if (!randomPrimaryCreep) {creep.deleteTask();creep.Invisible();continue;}
            if (creep._boost() === OK) continue
            if (creep.isIdle() && randomPrimaryCreep.isIdle()) {creep.Invisible();continue;}
                        
            if (creep.isIdle()){
                var primaryTaskInfo = Game.rooms[creep.memory.home].taskInfo(randomPrimaryCreep.memory.taskFingerprint)
                var taskList = utils.analyseTaskList(creepConfig.groupAcceptedTask[groupType][creep.memory.role][0])
                var mainTask = taskList[0], subTask = taskList[1][0]
                if (mainTask === "attack"){
                    if (subTask === "heal"){
                        var fingerprint = Game.rooms[creep.memory.home].AddAttackTask(subTask,"creep",primaryTaskInfo.data.routes,Infinity,false,true,true);
                        if (fingerprint) creep.memory.taskFingerprint = fingerprint
                    }
                }else if (mainTask === "transfer"){
                    if (subTask === "remote"){
                        var from, fromRoom
                        if (groupType === "remoteHarvest") from = "creep"
                        else if (groupType === "powerHarvest") from = "power"
                        if (from === "power") fromRoom = primaryTaskInfo.data.targetRoom
                        if (from === "creep") fromRoom = primaryTaskInfo.data.targetPos["roomName"]
                            
                        var fingerprint = Game.rooms[creep.memory.home].AddTransferTask(subTask,from,Game.rooms[creep.memory.home].storage.id,undefined,"full",fromRoom,creep.memory.home,1,false,true,true)
                        if (fingerprint) creep.memory.taskFingerprint = fingerprint
                    }
                }
            }

            if (!creep.isIdle()){
                var signals = {}
                signals["creep"] = randomPrimaryCreep
                var feedback = creep.run(signals)
                var cnt = 1
                while (cnt <= MAX_CALL_TIME && feedback === ERR_REPEAT) creep.run(signals)
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