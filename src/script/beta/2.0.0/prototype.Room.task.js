const utils = require('utils')
const taskConfig = require('configuration.Task')
const tailInsertTask = ["repair"]
module.exports = function () {
    _.assign(Room.prototype,roomTaskExtension)
}
const roomTaskExtension = {
    initTaskMemory(taskType){
        if (!this.memory.task) this.memory.task = {}
        if (!this.memory.task.fingerprints) this.memory.task.fingerprints = {}
        if (!this.memory.task.info) this.memory.task.info = {}
        if (!this.memory.task[taskType]) this.memory.task[taskType] = []
    },
    renewTask(fingerprint){
        if (!this.checkTaskExistence(fingerprint)) return
        this.memory.task.info[fingerprint].settings.receivedGroupsNum++;
        if (this.memory.task.info[fingerprint].settings.receivedGroupsNum === 1) {
            const taskType = this.memory.task.info[fingerprint].taskType
            if (!tailInsertTask.find(taskType)) this.memory.task[taskType].unshift(fingerprint);
            else    this.memory.task[taskType].push(fingerprint);
        }
    },
    finishTask(fingerprint){
        if (!this.checkTaskExistence(fingerprint)) return
        this.memory.task.info[fingerprint].settings.workingGroupsNum--;
        if (this.memory.task.info[fingerprint].settings.receivedGroupsNum === 0 &&
            this.memory.task.info[fingerprint].settings.workingGroupsNum === 0) {
            delete this.memory.task.fingerprints[fingerprint]
            delete this.memory.task.info[fingerprint]
        }
    },
    taskInfo(fingerprint){
        return this.memory.task.info[fingerprint]
    },
    checkTaskExistence(fingerprint){
        if (this.memory.task.fingerprints[fingerprint]) return true
        return false
    },
    searchTask(taskType,subTaskType){
        var result = []
        for (var fingerprint of this.memory.task[taskType]){
            if (this.memory.task.info[fingerprint].subTaskType === subTaskType) result.push(fingerprint)
        }
        return result
    },
    deleteTask(taskType,fingerprint){
        delete this.memory.task.fingerprints[fingerprint]
        delete this.memory.task.info[fingerprint]
        var pos = this.memory.task[taskType].find(fingerprint)
        if (pos) this.memory.task[taskType].splice(pos,1)
    },
    sortTask(taskType,subTaskType){

    },
    getTask(taskType,subTaskType = "all"){
        if (this.memory.task[taskType] == []) return undefined
        this.sortTask(taskType,subTaskType)
        var i = 0;
        if (subTaskType !== "all"){
            for (i = 0; i <= this.memory.task[taskType].length; i++){
                if (i === this.memory.task[taskType].length) return undefined
                const taskInfo = this.memory.task.info[this.memory.task[taskType][i]]
                if (subTaskType.find(taskInfo.subTaskType)) break
            }
        }
        const fingerprint = this.memory.task[taskType][i]
        this.memory.task.info[fingerprint].settings.receivedGroupsNum--;
        this.memory.task.info[fingerprint].settings.workingGroupsNum++;
        if (this.memory.task.info[fingerprint].settings.receivedGroupsNum === 0) this.memory.task[taskType].splice(i,1);
        return fingerprint
    },
    AddTask(taskType,subTaskType,data,groupsNum,changeable){
        this.initTaskMemory(taskType)
        const fingerprint = utils.getTaskFingerprint(arguments)
        if (this.checkTaskExistence(fingerprint)) return false
        this.memory.task[taskType].push(fingerprint)
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
    },
    AddTransferTask(subTaskType,from,to,resourceType,amount,groupsNum = 1,changeable = true){
        const data = {from,to,resourceType,amount}
        this.AddTask("transfer",subTaskType,data,groupsNum,changeable)
    },
    AddHarvestTask(subTaskType,targetID,targetPos = undefined,chargeLink = false,cachedContainerPos = undefined,groupsNum = 1,changeable = false){
        const data = {targetID,targetPos,chargeLink,cachedContainerPos}
        this.AddTask("harvest",subTaskType,data,groupsNum,changeable)
    },
    // The priority of building is reflected by the order to create the constructionSites.
    AddBuildTask(targetID,targetPos = undefined,groupsNum = Infinity){
        const data = {targetID,targetPos}
        this.AddTask("build","default",data,groupsNum,changeable,true)
    },
    AddRepairTask(targetID,targetPos = undefined,groupsNum = 1){
        const data = {targetID,targetPos}
        this.AddTask("repair","default",data,groupsNum,changeable,true)
    },
    AddUpgradeTask(){
        const data = {targetID:this.controller.id}
        this.AddTask("upgrade","default",data,Infinity,true)
    },
    AddDefendTask(target,groupsNum = Infinity,changeable = true){
        const data = {target}
        this.AddTask("defend","default",data,groupsNum,changeable)
    },
    AddAttackTask(subTaskType,targetRoom,target,routes,groupsNum = Infinity,changeable = false){
        const data = {targetRoom,target,routes}
        this.AddTask("attack",subTaskType,data,groupsNum,changeable)
    },
    AddPickUpTask(targetID,targetPos,groupsNum = 1,changeable = true){
        const data = {targetID,targetPos}
        this.AddTask("pickup","default",data,groupsNum,changeable)
    },
    AddSpawnTask(role,components,groupType,groupName,boostCompounds,subTaskType = "default"){
        const data = {
            components,
            memory:{
                role:role,
                home:this.room.name,
                group:{
                    type:groupType,
                    name:groupName
                },
                taskFingerprint:null,
                boostCompounds
            }
        }
        this.AddTask("spawn","default",data,1,false)
    }
}