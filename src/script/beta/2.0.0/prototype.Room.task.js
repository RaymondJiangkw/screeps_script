const utils = require('utils')
module.exports = function () {
    _.assign(Room.prototype,roomTaskExtension)
}
const roomTaskExtension = {
    initTaskMemory(taskType){
        if (!this.memory.task) this.memory.task = {}
        if (!this.memory.task.fingerprints) this.memory.task.fingerprints = {}
        if (!this.memory.task[taskType]) this.memory.task[taskType] = []
    },
    finishTask(fingerprint){
        delete this.memory.task.fingerprints[fingerprint]
    },
    checkTaskExistence(fingerprint){
        if (this.memory.task.fingerprints[fingerprint]) return true
        return false
    },
    AddTransferTask(from,to,resourceType,amount,creepsNum = 1){
        this.initTaskMemory("transfer")
        const fingerprint = utils.getTaskFingerprint(arguments)
        if (this.checkTaskExistence(fingerprint)) return false
        this.memory.task.fingerprints[fingerprint] = true
        this.memory.task["transfer"].push({
            fingerprint:fingerprint,
            target:undefined,
            targetPos:undefined,
            settings:{
                from:from,
                to:to,
                creepsNum:creepsNum
            },
            options:{

            },
            data:{
                resourceType:resourceType,
                amount:amount
            }
        })
    },
    AddHarvestTask(target,creepsNum = 1){
        this.initTaskMemory("harvest")
        const fingerprint = utils.getTaskFingerprint(arguments)
        if (this.checkTaskExistence(fingerprint)) return false
        this.memory.task.fingerprints[fingerprint] = true
        this.memory.task["harvest"].push({
            fingerprint:fingerprint,
            target:undefined,
            targetPos:undefined,
            settings:{
                target:target,
                creepsNum:creepsNum
            },
            options:{

            },
            data:{

            }
        })
    },
    AddUpgradeTask(creepsNum = -1){
        this.initTaskMemory("upgrade")
        const fingerprint = utils.getTaskFingerprint(arguments)
        if (this.checkTaskExistence(fingerprint)) return false
        this.memory.task.fingerprints[fingerprint] = true
        this.memory.task["upgrade"].push({
            fingerprint:fingerprint,
            target:undefined,
            targetPos:undefined,
            settings:{
                creepsNum:creepsNum
            },
            options:{

            },
            data:{

            }
        })
    },
    AddSpawnTask(role,name,components,acceptedTask,groupType,groupName){
        this.initTaskMemory("spawn")
        const fingerprint = utils.getTaskFingerprint(arguments)
        if (this.checkTaskExistence(fingerprint)) return false
        this.memory.task.fingerprints[fingerprint] = true
        this.memory.task["spawn"].push({
            fingerprint:fingerprint,
            name:name,
            components:components,
            data:{
                memory:{
                    role:role,
                    home:this.room.name,
                    acceptedTask:acceptedTask,
                    group:{
                        groupType:groupType,
                        groupName:groupName
                    },
                    task:{
                                                
                    }
                }
            }
        })
    }
}