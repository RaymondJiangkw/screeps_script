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
    var creepGroups = _.groupBy(Game.rooms[roomName].creeps,(c)=>c.memory.group.type)
    for (var groupType in creepGroups){
    var creep_Groups = _.groupBy(creepGroups[groupType],(c)=>c.memory.group.name)
    for (var groupName in creep_Groups){
        const creeps = _.groupBy(creep_Groups[groupName],(c)=>c.memory.role)
        const groupRoles = Object.keys(creepConfig.groupAcceptedTask[groupType])
        const primaryCreepRole = groupRoles[0]
        for (var groupRole of groupRoles) if (!creeps[groupRole]) creeps[groupRole] = []
        
        if (creeps[primaryCreepRole].length === 0) continue

        for (var primaryCreep of creeps[primaryCreepRole]){
            if (primaryCreep.dying()){
                primaryCreep.memory.dying = true
                primaryCreep.toDeath(true)
                continue
            }
            if (primaryCreep.isIdle()) primaryCreep.getTask()
            if (primaryCreep._boost() === OK) continue
            if (!primaryCreep.isIdle()) {
                signals = {}
                if (groupType === "remoteHarvest"){
                    const transferCreeps = treatedPorters(creeps["transferer"])
                    if (transferCreeps.length > 0) signals["transfer"] = transferCreeps[0].id
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
                let reSpawn = false
                const randomPrimaryCreep = randomElement(creeps[primaryCreepRole])
                if (!randomPrimaryCreep) {
                    const isReSpawn = _.filter(Game.rooms[creep.memory.home].searchTask("spawn","default"),(t)=>Game.rooms[creep.memory.home].taskInfo(t).data.memory.role == primaryCreepRole && 
                                                                                                                Game.rooms[creep.memory.home].taskInfo(t).data.memory.group.type == creep.memory.group.type && 
                                                                                                                Game.rooms[creep.memory.home].taskInfo(t).data.memory.group.name == creep.memory.group.name)
                    if (isReSpawn.length > 0) reSpawn = true
                }
                if (creep.dying()){
                    creep.memory.dying = true
                    if (reSpawn || (randomPrimaryCreep && (!randomPrimaryCreep.isIdle() || randomPrimaryCreep.getTask(dry = true)))) creep.toDeath(false,canGetTask = true)
                    else creep.toDeath(false,canGetTask = false)
                    continue
                }
                
                if (!randomPrimaryCreep) continue
                if (creep._boost() === OK) continue
                if (creep.isIdle() && randomPrimaryCreep.isIdle()) continue
                        
                if (creep.isIdle()){
                    var primaryTaskInfo = Game.rooms[creep.memory.home].taskInfo(randomPrimaryCreep.memory.taskFingerprint)
                    var taskList = utils.analyseTaskList(creepConfig.groupAcceptedTask[groupType][creep.memory.role][0])
                    var mainTask = taskList[0], subTask = taskList[1][0]
                    if (mainTask === "attack"){
                        if (subTask === "heal"){
                            var fingerprint = Game.rooms[creep.memory.home].AddAttackTask(subTask,primaryTaskInfo.data.targetRoom,"creep",primaryTaskInfo.data.routes,Infinity,false,true,true)
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
                    signals["creep"] = randomPrimaryCreep.id
                    
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