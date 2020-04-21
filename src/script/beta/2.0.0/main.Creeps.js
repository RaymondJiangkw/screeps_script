const FINISH = "finish"
const ERR_RENEW = "renew"
const ERR_DELETE = "delete"
const creepConfig = require('configuration.Creep')
const utils = require('utils')
const randomElement = function(array){
    return array[Math.floor(Math.random() * array.length)]
}
module.exports = function(){
    for (var roomName of global.rooms.my){
        var creepGroups = _.groupBy(Game.rooms[roomName].creeps,(c)=>c.memory.group.type)
        for (var groupType in creepGroups){
            var creep_Groups = _.groupBy(creepGroups[groupType],(c)=>c.memory.group.name)
            for (var groupName in creep_Groups){
                const creeps = _.groupBy(creep_Groups[groupName],(c)=>c.memory.role)
                const groupRoles = Object.keys(creepConfig.groupAcceptedTask[groupType])
                for (var groupRole of groupRoles) if (!creeps[groupRole]) creeps[groupRole] = []
                const primaryCreepRole = groupRoles[0]
                if (creeps[primaryCreepRole].length === 0) continue
                for (var primaryCreep of creeps[primaryCreepRole]){
                    // Prepare Part
                    if (primaryCreep.dying()){
                        if (!primaryCreep.isIdle() || primaryCreep.getTask(true)) primaryCreep.toDeath(true,true)
                        else primaryCreep.toDeath(true,false)
                        continue
                    }
                    if (primaryCreep._boost() === OK) continue 
                    if (primaryCreep.isIdle()) primaryCreep.getTask()
                    if (!primaryCreep.isIdle()) {
                        signals = {}
                        if (groupType === "remoteHarvest"){
                            if (this.store.getFreeCapacity() === 0){
                                const transferCreeps = _.filter(creeps,(c)=>c.store.getFreeCapacity() > 0)
                                transferCreeps = _.filter(creeps,(c)=>utils.adjacent(primaryCreep.id,c.id))
                                transferCreeps.sort((c1,c2)=>c2.store.getFreeCapacity() - c1.store.getFreeCapacity())
                                if (transferCreeps.length > 0){
                                    signals["transfer"] = transferCreeps[0].id
                                }
                            }
                        }
                        var feedback = primaryCreep.run(signals)
                        if (feedback === FINISH) primaryCreep.finishTask()
                        else if (feedback === ERR_RENEW) primaryCreep.renewTask()
                        else if (feedback === ERR_DELETE) primaryCreep.deleteTask()
                    }
                }
                for (var i = 1; i < groupRoles.length;i++){
                    const servantCreepRole = groupRoles[i]
                    for (var creep of creeps[servantCreepRole]){
                        const randomPrimaryCreep = randomElement(creeps[primaryCreepRole])
                        // Prepare Part
                        if (creep.dying()){
                            if (!primaryCreep.isIdle() || primaryCreep.getTask(true)) creep.toDeath(canGetTask = true)
                            else creep.toDeath(canGetTask = false)
                            continue
                        }
                        if (creep._boost() === OK) continue
                        if (creep.isIdle() && randomPrimaryCreep.isIdle()) continue
                        
                        if (creep.isIdle()){
                            var primaryTaskInfo = Game.rooms[this.memory.home].taskInfo(randomPrimaryCreep.memory.taskFingerprint)
                            var taskList = creepConfig.groupAcceptedTask[groupType][creep.memory.role]
                            taskList = taskList.split('-')
                            var mainTask = taskList[0]
                            var subTask = taskList[1]
                            if (mainTask === "attack"){
                                if (subTask === "heal"){
                                    var fingerprint = Game.rooms[this.memory.home].AddAttackTask(subTask,primaryTaskInfo.data.targetRoom,"creep",primaryTaskInfo.data.routes,silence = true)
                                    if (fingerprint) this.memory.taskFingerprint = fingerprint
                                }
                            }else if (mainTask === "transfer"){
                                if (subTask === "remote"){
                                    var from = undefined
                                    var fromRoom = undefined
                                    if (groupType === "remoteHarvest") from = "creep"
                                    else if (groupType === "powerHarvest") from = "power"
                                    if (from === "power") fromRoom = primaryTaskInfo.data.targetRoom
                                    if (from === "creep") fromRoom = primaryTaskInfo.data.targetPos["roomName"]
                                    var fingerprint = Game.rooms[this.memory.home].AddTransferTask(subTask,from,Game.rooms[this.memory.home].storage.id,fromRoom = fromRoom,silence = true)
                                    if (fingerprint) this.memory.taskFingerprint = fingerprint
                                }
                            }
                        }
                        if (!creep.isIdle()){
                            var signals = {}
                            signals["creep"] = randomPrimaryCreep.id
                            var feedback = creep.run(signals)
                            if (feedback === FINISH) creep.finishTask()
                            else if (feedback === ERR_RENEW) creep.renewTask()
                            else if (feedback === ERR_DELETE) creep.deleteTask()
                        }
                    }
                }
            }
        }
    }
}