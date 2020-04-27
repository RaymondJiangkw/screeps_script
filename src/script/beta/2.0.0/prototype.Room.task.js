const utils = require('utils')
const tailInsertTask = ["repair"]
const taskPriority = require('configuration.taskPriority')
const INFINITY = 32767
const roomTaskExtension = {
    initTaskMemory(taskType){
        if (!this.memory.task) this.memory.task = {}
        if (!this.memory.task.info) this.memory.task.info = {}
        if (!this.memory.task[taskType]) this.memory.task[taskType] = []
        if (!this.memory.task["_" + taskType]) this.memory.task["_" + taskType] = []
    },
    refreshTask(){
        if (!this.memory.task) this.memory.task = {}
        for (var taskType in this.memory.task){
            if (taskType == "spawn" || taskType == "_spawn" || taskType == "info") continue
            for (var taskFingerprint of this.memory.task[taskType]){
                if (this.memory.task.info[taskFingerprint]) delete this.memory.task.info[taskFingerprint]
            }
            delete this.memory.task[taskType]
        }
        for (var creep of Game.rooms[this.name].creeps) creep.memory.taskFingerprint = null
        for (var spawn of Game.rooms[this.name].spawns) spawn.memory.taskFingerPrint = null
    },
    clearTask(){
        this.memory.task = {}
        for (var creep of Game.rooms[this.name].creeps) creep.memory.taskFingerprint = null
        for (var spawn of Game.rooms[this.name].spawns) spawn.memory.taskFingerPrint = null
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
    searchTask(taskType,subTaskType = "all"){
        if (!this.memory.task[taskType]) return []
        var result = []
        for (var fingerprint of this.memory.task[taskType]){
            if (subTaskType == "default" || subTaskType == "all" || this.memory.task.info[fingerprint].subTaskType === subTaskType) result.push(fingerprint)
        }
        return result
    },
    countTask(taskType,subTaskList){
        var cnt = 0
        for (var subTaskType of subTaskList){
            var available = this.searchTask(taskType,subTaskType)
            cnt += available.length
        }
        return cnt
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
    sortTask(taskType,taskList,priority_limit = INFINITY){
        if (taskType === "spawn"){
            taskList = _.filter(taskList,(f)=>{
                const taskInfo = this.taskInfo(f)
                return taskPriority["spawn"][taskInfo.data.memory.role][taskInfo.data.memory.group.type] <= priority_limit
            })
            const cmp = (f1,f2) => {
                const taskInfo1 = this.taskInfo(f1)
                const taskInfo2 = this.taskInfo(f2)
                return taskPriority["spawn"][taskInfo1.data.memory.role][taskInfo1.data.memory.group.type] - taskPriority["spawn"][taskInfo2.data.memory.role][taskInfo2.data.memory.group.type]
            }
            taskList.sort(cmp)
        }
        return taskList
    },
    getTask(subject,taskType,subTaskType = "all",dry = false,priority_limit = INFINITY){
        if (!this.memory.task[taskType] || this.memory.task[taskType].length == 0) return undefined
        var potentialTaskList = _.filter(this.memory.task[taskType],(t)=>subTaskType == "all" || subTaskType.indexOf(this.memory.task.info[t].subTaskType) >= 0)
        if (potentialTaskList.length === 0) return undefined
        if (dry) return true
        potentialTaskList.sort((t1,t2)=>{
            const taskInfo1 = this.memory.task.info[t1]
            const taskInfo2 = this.memory.task.info[t2]
            var targetPos1 = taskInfo1.data.targetPos
            var targetPos2 = taskInfo2.data.targetPos
            var range1 = 0,range2 = 0
            try {const pos = new RoomPosition(targetPos1.x,targetPos1.y,targetPos1.roomName);range1 = pos.getRangeTo(subject)} catch (error) {}
            try {const pos = new RoomPosition(targetPos2.x,targetPos2.y,targetPos2.roomName);range2 = pos.getRangeTo(subject)} catch (error) {}
            return range1 - range2
        })
        potentialTaskList = this.sortTask(taskType,potentialTaskList,priority_limit)
        const fingerprint = potentialTaskList[0]
        this.memory.task.info[fingerprint].settings.receivedGroupsNum--;
        this.memory.task.info[fingerprint].settings.workingGroupsNum++;
        if (this.memory.task.info[fingerprint].settings.receivedGroupsNum <= 0) this.memory.task[taskType].splice(this.memory.task[taskType].indexOf(fingerprint),1);
        return fingerprint
    },
    AddTask(taskType,subTaskType,data,groupsNum,changeable,silence = false,getRepeat = false,salt = undefined){
        this.initTaskMemory(taskType)
        if (!Number.isFinite(groupsNum)) groupsNum = 32767
        const _getRepeat = getRepeat
        getRepeat = false
        const fingerprint = utils.getTaskFingerprint(arguments)
        if (this.checkTaskExistence(fingerprint)) {
            if (_getRepeat) return fingerprint
            else return false
        }
        if (taskType === "spawn") console.log("AddTask",JSON.stringify(data))
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
    AddTransferTask(subTaskType,from,to,resourceType = undefined,amount = "full",fromRoom = undefined,toRoom = undefined,groupsNum = 1,changeable = true,silence = false,getRepeat = false){
        var toTarget = Game.getObjectById(to)
        if (toTarget && toTarget.store.getFreeCapacity() == 0) return undefined
        if (typeof(amount) === "number" && !Number.isFinite(amount)) amount = "exhaust"
        const data = {from,fromRoom,to,toRoom,resourceType,amount}
        return this.AddTask("transfer",subTaskType,data,groupsNum,changeable,silence,getRepeat)
    },
    AddAidTask(from,fromRoom,to,toRoom,resourceType,stopAmount,toStopAmount,groupsNum = 1,changeable = false,silence = false,getRepeat = false){
        var toTarget = Game.getObjectById(to)
        if (toTarget && toTarget.store.getUsedCapacity() > toStopAmount) return undefined
        const data = {from,fromRoom,to,toRoom,resourceType,stopAmount,toStopAmount}
        return this.AddTask("transfer","aid",data,groupsNum,changeable,silence,getRepeat)
    },
    AddHarvestTask(subTaskType,targetID,targetPos = undefined,groupsNum = 1,changeable = false,silence = false,getRepeat = false){
        const data = {targetID,targetPos}
        return this.AddTask("harvest",subTaskType,data,groupsNum,changeable,silence,getRepeat)
    },
    // The priority of building is reflected by the order to create the constructionSites.
    AddBuildTask(subTaskType,targetID,targetPos = undefined,groupsNum = Infinity,silence = false,getRepeat = false){
        const data = {targetID,targetPos}
        return this.AddTask("build",subTaskType,data,groupsNum,true,silence,getRepeat)
    },
    AddRepairTask(subTaskType,targetID,targetPos = undefined,groupsNum = 1,silence = false,getRepeat = false){
        const data = {targetID,targetPos}
        return this.AddTask("repair",subTaskType,data,groupsNum,true,silence,getRepeat)
    },
    AddUpgradeTask(salt = undefined,silence = false,getRepeat = false){
        const data = {targetID:this.controller.id}
        return this.AddTask("upgrade","default",data,Infinity,true,silence,getRepeat,salt)
    },
    AddDefendTask(subTaskType,target,targetRoom,groupsNum = Infinity,changeable = false,silence = false,getRepeat = false){
        const data = {target,targetRoom}
        return this.AddTask("defend",subTaskType,data,groupsNum,changeable,silence,getRepeat)
    },
    AddAttackTask(subTaskType,targetRoom,target = undefined,routes = [],groupsNum = Infinity,changeable = false,silence = false,getRepeat = false){
        const data = {targetRoom,target,routes}
        return this.AddTask("attack",subTaskType,data,groupsNum,changeable,silence,getRepeat)
    },
    AddPickUpTask(subTaskType,targetID,targetPos,groupsNum = Infinity,changeable = true,silence = false,getRepeat = false){
        if (!this.storage || this.storage.store.getFreeCapacity() == 0) return undefined
        const data = {targetID,targetPos}
        return this.AddTask("pickup",subTaskType,data,groupsNum,changeable,silence,getRepeat)
    },
    AddTravelTask(targetRoom,groupsNum = 1,changeable = true,silence = false,getRepeat = false){
        const data = {targetRoom,roomList:[]}
        return this.AddTask("travel","default",data,groupsNum,changeable,silence,getRepeat)
    },
    AddSpawnTask(role,components,groupType,groupName,boostCompounds,subTaskType = "default",salt = undefined){
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
                boostCompounds,
                salt
            }
        }
        return this.AddTask("spawn","default",data,1,false,false,false,salt)
    }
}

_.assign(Room.prototype,roomTaskExtension)