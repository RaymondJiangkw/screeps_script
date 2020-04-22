const utils = require('utils')
const tailInsertTask = ["repair"]
module.exports = function () {
    _.assign(Room.prototype,roomTaskExtension)
}
const roomTaskExtension = {
    initTaskMemory(taskType){
        if (!this.memory.task) this.memory.task = {}
        if (!this.memory.task.info) this.memory.task.info = {}
        if (!this.memory.task[taskType]) this.memory.task[taskType] = []
        if (!this.memory.task["_" + taskType]) this.memory.task["_" + taskType] = []
    },
    renewTask(fingerprint){
        if (!this.checkTaskExistence(fingerprint)) return
        this.memory.task.info[fingerprint].settings.receivedGroupsNum++;
        this.memory.task.info[fingerprint].settings.workingGroupsNum--;
        if (this.memory.task.info[fingerprint].settings.receivedGroupsNum === 1) {
            const taskType = this.memory.task.info[fingerprint].taskType
            if (tailInsertTask.indexOf(taskType) < 0) this.memory.task[taskType].unshift(fingerprint);
            else    this.memory.task[taskType].push(fingerprint);
        }
    },
    finishTask(fingerprint){
        if (!this.checkTaskExistence(fingerprint)) return
        this.memory.task.info[fingerprint].settings.workingGroupsNum--;
        if (this.memory.task.info[fingerprint].settings.receivedGroupsNum <= 0 &&
            this.memory.task.info[fingerprint].settings.workingGroupsNum <= 0) {
            const taskType = this.memory.task.info[fingerprint].taskType
            const pos1 = this.memory.task[taskType].indexOf(fingerprint)
            const pos2 = this.memory.task["_" + taskType].indexOf(fingerprint)
            if (pos1 >= 0) this.memory.task[taskType].splice(pos1,1);
            if (pos2 >= 0) this.memory.task["_" + taskType].splice(pos2,1);
            delete this.memory.task.info[fingerprint]
        }
    },
    taskInfo(fingerprint){
        return this.memory.task.info[fingerprint]
    },
    checkTaskExistence(fingerprint){
        if (this.memory.task.info[fingerprint]) return true
        return false
    },
    searchTask(taskType,subTaskType){
        var result = []
        for (var fingerprint of this.memory.task[taskType]){
            if (this.memory.task.info[fingerprint].subTaskType === subTaskType) result.push(fingerprint)
        }
        return result
    },
    deleteTask(fingerprint){
        if (!this.checkTaskExistence(fingerprint)) return
        const taskType = this.memory.task.info[fingerprint].taskType
        delete this.memory.task.info[fingerprint]
        var pos1 = this.memory.task[taskType].indexOf(fingerprint)
        var pos2 = this.memory.task["_" + taskType].indexOf(fingerprint)
        if (pos1 >= 0) this.memory.task[taskType].splice(pos1,1)
        if (pos2 >= 0) this.memory.task["_" + taskType].splice(pos2,1)
    },
    sortTask(taskType,subTaskType){

    },
    getTask(taskType,subTaskType = "all",dry = false){
        if (!this.memory.task[taskType] || this.memory.task[taskType].length == 0) return undefined
        this.sortTask(taskType,subTaskType)
        var i = 0;
        if (subTaskType !== "all"){
            for (i = 0; i < this.memory.task[taskType].length; i++){
                const taskInfo = this.memory.task.info[this.memory.task[taskType][i]]
                if (subTaskType.indexOf(taskInfo.subTaskType) >= 0) break
            }
            if (i === this.memory.task[taskType].length) return undefined
        }
        if (dry) return true
        const fingerprint = this.memory.task[taskType][i]
        this.memory.task.info[fingerprint].settings.receivedGroupsNum--;
        this.memory.task.info[fingerprint].settings.workingGroupsNum++;
        if (this.memory.task.info[fingerprint].settings.receivedGroupsNum <= 0) this.memory.task[taskType].splice(i,1);
        return fingerprint
    },
    AddTask(taskType,subTaskType,data,groupsNum,changeable,silence = false,getRepeat = false){
        this.initTaskMemory(taskType)
        if (!Number.isFinite(groupsNum)) groupsNum = 32767
        const fingerprint = utils.getTaskFingerprint(arguments)
        if (this.checkTaskExistence(fingerprint)) {
            if (getRepeat) return fingerprint
            else return false
        }
        if (!silence) {this.memory.task[taskType].push(fingerprint);this.memory.task["_" + taskType].push(fingerprint);}
        this.memory.task.info[fingerprint] = {
            taskType,subTaskType,targetID:null,targetPos:null,
            settings:{
                receivedGroupsNum:groupsNum,
                workingGroupsNum:0,
                changeable
            },
            options:{},
            data
        }
        return fingerprint
    },
    AddTransferTask(subTaskType,from,to,resourceType,amount = "full",fromRoom = undefined,toRoom = undefined,groupsNum = 1,changeable = true,silence = false,getRepeat = false){
        var toTarget = Game.getObjectById(to)
        if (toTarget && toTarget.store.getFreeCapacity() == 0) return undefined
        const data = {from,fromRoom,to,toRoom,resourceType,amount}
        return this.AddTask("transfer",subTaskType,data,groupsNum,changeable,silence,getRepeat)
    },
    AddHarvestTask(subTaskType,targetID,targetPos = undefined,groupsNum = 1,changeable = false,silence = false,getRepeat = false){
        const data = {targetID,targetPos}
        return this.AddTask("harvest",subTaskType,data,groupsNum,changeable,silence,getRepeat)
    },
    // The priority of building is reflected by the order to create the constructionSites.
    AddBuildTask(targetID,targetPos = undefined,groupsNum = Infinity,silence = false,getRepeat = false){
        const data = {targetID,targetPos}
        return this.AddTask("build","default",data,groupsNum,true,silence,getRepeat)
    },
    AddRepairTask(subTaskType,targetID,targetPos = undefined,groupsNum = 1,silence = false,getRepeat = false){
        const data = {targetID,targetPos}
        return this.AddTask("repair",subTaskType,data,groupsNum,true,silence,getRepeat)
    },
    AddUpgradeTask(silence = false,getRepeat = false){
        const data = {targetID:this.controller.id}
        return this.AddTask("upgrade","default",data,Infinity,true,silence,getRepeat)
    },
    AddDefendTask(target,groupsNum = Infinity,changeable = true,silence = false,getRepeat = false){
        const data = {target}
        return this.AddTask("defend","default",data,groupsNum,changeable,silence,getRepeat)
    },
    AddAttackTask(subTaskType,targetRoom,target,routes,groupsNum = Infinity,changeable = false,silence = false,getRepeat = false){
        const data = {targetRoom,target,routes}
        return this.AddTask("attack",subTaskType,data,groupsNum,changeable,silence,getRepeat)
    },
    AddPickUpTask(targetID,targetPos,groupsNum = 1,changeable = true,silence = false,getRepeat = false){
        const data = {targetID,targetPos}
        return this.AddTask("pickup","default",data,groupsNum,changeable,silence,getRepeat)
    },
    AddSpawnTask(role,components,groupType,groupName,boostCompounds,subTaskType = "default",silence = false,getRepeat = false){
        const data = {
            components,
            memory:{
                role:role,
                home:this.name,
                group:{
                    type:groupType,
                    name:groupName
                },
                taskFingerprint:null,
                boostCompounds
            }
        }
        return this.AddTask("spawn","default",data,1,false,silence,getRepeat)
    }
}