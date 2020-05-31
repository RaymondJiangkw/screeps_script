const utils = require('utils')
const notRefreshList = ["spawn","_spawn","harvest","_harvest","defend","_defend","attack","_attack","info"];
const notRefreshSubTask = {"transfer":["remote"],"_transfer":["remote"]};
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
        if (!this.memory.task) this.memory.task = {};
        if (!this.memory.task.info) this.memory.task.info = {};
        for (var taskType in this.memory.task){
            if (notRefreshList.indexOf(taskType) >= 0) continue;
            var afterList = [];
            for (var taskFingerprint of this.memory.task[taskType]){
                const taskInfo = this.memory.task.info[taskFingerprint];
                if (taskInfo && notRefreshSubTask[taskType] && notRefreshSubTask[taskType].indexOf(taskInfo.subTaskType) >= 0) afterList.push(taskFingerprint);
                else if (taskInfo) delete this.memory.task.info[taskFingerprint];
            }
            this.memory.task[taskType] = afterList;
        }
        for (var taskFingerprint in this.memory.task["info"]) this.refreshSingleTask(taskFingerprint)
        for (var creep of Game.rooms[this.name].creeps) creep.memory.taskFingerprint = null
    //    for (var spawn of Game.rooms[this.name].spawns) spawn.memory.taskFingerPrint = null
    },
    clearTaskType(_taskType){
        if (!this.memory.task) this.memory.task = {}
        if (!this.memory.task.info) this.memory.task.info = {};
        for (var fingerprint in this.memory.task.info) {
            const taskType = this.memory.task.info[fingerprint].taskType;
            if (taskType === _taskType) delete this.memory.task.info[fingerprint];
        }
        delete this.memory.task[_taskType];
        delete this.memory.task["_" + _taskType];
    },
    clearTask(){
        this.memory.task = {}
        for (var creep of Game.rooms[this.name].creeps) creep.memory.taskFingerprint = null
        for (var spawn of Game.rooms[this.name].spawns) spawn.memory.taskFingerPrint = null
    },
    checkTaskExistence(fingerprint){
        if (this.memory.task.info[fingerprint]) return true
        return false
    },
    refreshSingleTask(fingerprint){
        if (!this.checkTaskExistence(fingerprint)) return;
        const taskInfo = this.memory.task.info[fingerprint];
        if (taskInfo.settings.receivedGroupsNum === 0 && taskInfo.settings.silence !== true) {
            const taskType = taskInfo.taskType;
            this.memory.task[taskType].push(fingerprint);
        }
        taskInfo.settings.receivedGroupsNum = taskInfo.settings.allGroupsNum;
        taskInfo.settings.workingGroupsNum = 0;
    },
    renewTask(fingerprint){
        if (!this.checkTaskExistence(fingerprint)) return
        const taskInfo = this.memory.task.info[fingerprint]
        if (taskInfo.settings.receivedGroupsNum === 0) {
            const taskType = taskInfo.taskType;
            this.memory.task[taskType].push(fingerprint);
        }
        taskInfo.settings.receivedGroupsNum++;
        taskInfo.settings.workingGroupsNum--;
    },
    _spliceTask(taskType,fingerprint){
        const pos = this.memory.task[taskType].indexOf(fingerprint)
        if (pos >= 0) this.memory.task[taskType].splice(pos,1);
    },
    finishTask(fingerprint){
        if (!this.checkTaskExistence(fingerprint)) return
        const taskInfo = this.memory.task.info[fingerprint]
        taskInfo.settings.workingGroupsNum--;
        if (taskInfo.settings.receivedGroupsNum === 0 && taskInfo.settings.workingGroupsNum === 0) this.deleteTask(fingerprint)
    },
    taskInfo(fingerprint){
        return this.memory.task.info[fingerprint]
    },
    searchTask(taskType,subTaskType = "all"){
        if (!this.memory.task[taskType]) return []
        if (!Array.isArray(subTaskType)) subTaskType = [subTaskType]
        var ret = []
        for (var fingerprint of this.memory.task[taskType]){
            if (subTaskType[0] === "default" || subTaskType[0] === "all") ret.push(fingerprint)
            else if (subTaskType.indexOf(this.memory.task.info[fingerprint].subTaskType) >= 0) ret.push(fingerprint)
        }
        return ret
    },
    countTask(taskType,subTaskList = ["all"]){
        return this.searchTask(taskType,subTaskList).length
    },
    deleteTask(fingerprint){
        if (!this.checkTaskExistence(fingerprint)) return;
        const taskType = this.memory.task.info[fingerprint].taskType
        delete this.memory.task.info[fingerprint]
        this._spliceTask(taskType,fingerprint);
        this._spliceTask("_" + taskType,fingerprint);
    },
    sortTask(subject,taskType,taskList,priority_limit = INFINITY){
        if (taskType === "spawn"){
            taskList = _.filter(taskList,(f)=>taskPriority["spawn"][this.memory.task.info[f].data.memory.role][this.memory.task.info[f].data.memory.group.type] <= priority_limit)
            const priorityCMP = (f1,f2) => taskPriority["spawn"][this.memory.task.info[f1].data.memory.role][this.memory.task.info[f1].data.memory.group.type] - taskPriority["spawn"][this.memory.task.info[f2].data.memory.role][this.memory.task.info[f2].data.memory.group.type]
            taskList.sort(priorityCMP)
        }else if (taskType === "harvest"){
            taskList.sort((t1,t2)=>{
                const taskInfo1 = this.memory.task.info[t1],taskInfo2 = this.memory.task.info[t2]
                var targetPos1 = taskInfo1.data.targetPos,targetPos2 = taskInfo2.data.targetPos
                var range1 = 0,range2 = 0
                try {const pos = new RoomPosition(targetPos1.x,targetPos1.y,targetPos1.roomName);range1 = pos.getRangeTo(subject)} catch (error) {}
                try {const pos = new RoomPosition(targetPos2.x,targetPos2.y,targetPos2.roomName);range2 = pos.getRangeTo(subject)} catch (error) {}
                return range1 - range2
            })
        }
        return taskList
    },
    getTask(subject,taskType,subTaskType = "all",dry = false,priority_limit = INFINITY){
        if (!this.memory.task[taskType] || this.memory.task[taskType].length == 0) return undefined;
        var potentialTaskList = this.memory.task[taskType];
        if (subTaskType !== "all") potentialTaskList = _.filter(potentialTaskList,(t)=>subTaskType.indexOf(this.memory.task.info[t].subTaskType) >= 0)
        if (dry) return true
        potentialTaskList = this.sortTask(subject,taskType,potentialTaskList,priority_limit)
        if (potentialTaskList.length === 0) return undefined
        const fingerprint = potentialTaskList[0]
        this.memory.task.info[fingerprint].settings.receivedGroupsNum--;
        this.memory.task.info[fingerprint].settings.workingGroupsNum++;
        if (this.memory.task.info[fingerprint].settings.receivedGroupsNum === 0) this._spliceTask(taskType,fingerprint);
        return fingerprint
    },
    AddTask(taskType,subTaskType,data,groupsNum = 1,changeable = true,silence = false,getRepeat = false){
        this.initTaskMemory(taskType)
        if (!Number.isFinite(groupsNum)) groupsNum = INFINITY;
        var _getRepeat = false;
        if (getRepeat) _getRepeat = true;
        getRepeat = false;
        const fingerprint = utils.getTaskFingerprint(arguments)
        if (this.checkTaskExistence(fingerprint)) {
            if (_getRepeat) return fingerprint
            else return false
        }
        console.log(this.name,"AddTask",taskType,subTaskType,JSON.stringify(data))
        if (!silence) {this.memory.task[taskType].push(fingerprint);this.memory.task["_" + taskType].push(fingerprint);}
        this.memory.task.info[fingerprint] = {
            taskType,subTaskType,targetID:null,targetPos:null,
            settings:{
                receivedGroupsNum:groupsNum,
                workingGroupsNum:0,
                allGroupsNum:groupsNum,
                changeable,
                silence,
            },
            options:{},
            data
        }
        return fingerprint
    },
    /**
     * Add the Transfer Task.
     * @param   {String}            subTaskType         sub-taskType of "transfer" task.
     * @param   {Object}            from                Object describes the fromTarget.
     * @param   {String}            from.target         The Id of the target, or can be one of the recognizable structureType, such as "storage".
     * @param   {String|undefined}  from.roomName       The room where the target lies. undefined will be interpreted as the home of the working creep.
     * @param   {Object}            to                  Object describes the toTarget.
     * @param   {String}            to.target           The Id of the target, or can be one of the recognizable structureType, such as "storage".
     * @param   {String|undefined}  to.roomName         The room where the target lies. undefined will be interpreted as the home of the working creep.
     * @param   {String}            resourceType        One of the RESOURCE_* Constants. 
     * @param   {Number|String}     amount              describes the transfer amount, can be "full" or "exhaust", indicating fill in the toTarget or exhaust the fromTarget.
     * @param   {Object}            complements         Other potential useful information.
     * @param   {Object}            settings            The settings of the task.
     * @param   {Number}            settings.groupsNum  The expected running-groups number, default is 1.
     * @param   {Boolean}           settings.changeable Whether this task is changeable, default is true.
     * @returns {Number}    OK, indicating successful or error code.
     */
    AddTransferTask(subTaskType,from,to,resourceType,amount = "full",settings = {groupsNum:1,changeable:true,silence:false,getRepeat:false},complements = {}){
        _.defaults(settings,{groupsNum:1,changeable:true,silence:false,getRepeat:false});
        return this.AddTask("transfer",subTaskType,{from,to,resourceType,amount,complements},settings.groupsNum,settings.changeable,settings.silence,settings.getRepeat);
    },
    AddHarvestTask(subTaskType,targetID,targetPos = undefined,groupsNum = 1,changeable = false,silence = false,getRepeat = false){
        const data = {targetID,targetPos}
        return this.AddTask("harvest",subTaskType,data,groupsNum,changeable,silence,getRepeat)
    },
    AddBuildTask(subTaskType,targetID,targetPos = undefined,groupsNum = Infinity,silence = false,getRepeat = false){
        const data = {targetID,targetPos}
        return this.AddTask("build",subTaskType,data,groupsNum,true,silence,getRepeat)
    },
    AddRepairTask(subTaskType,targetID,targetPos = undefined,groupsNum = 1,silence = false,getRepeat = false){
        const data = {targetID,targetPos}
        return this.AddTask("repair",subTaskType,data,groupsNum,true,silence,getRepeat)
    },
    AddUpgradeTask(salt = 0,silence = false,getRepeat = false){
        const data = {targetID:this.controller.id,salt}
        return this.AddTask("upgrade","default",data,Infinity,true,silence,getRepeat)
    },
    AddDefendTask(subTaskType,targetRoom,groupsNum = Infinity,changeable = false,silence = false,getRepeat = false){
        const data = {targetRoom}
        return this.AddTask("defend",subTaskType,data,groupsNum,changeable,silence,getRepeat)
    },
    AddAttackTask(subTaskType,target,targetRoom,routes = [],groupsNum = Infinity,changeable = false,silence = false,getRepeat = false){
        const data = {target,targetRoom,routes}
        return this.AddTask("attack",subTaskType,data,groupsNum,changeable,silence,getRepeat)
    },
    AddPickUpTask(subTaskType,targetID,targetPos,toTarget,groupsNum = Infinity,changeable = true,silence = false,getRepeat = false){
        var to = Game.getObjectById(toTarget)
        if (to && to.store.getFreeCapacity() === 0) return undefined
        const data = {targetID,targetPos,toTarget}
        return this.AddTask("pickup",subTaskType,data,groupsNum,changeable,silence,getRepeat)
    },
    AddTravelTask(targetRoom,groupsNum = 1,changeable = true,silence = false,getRepeat = false){
        const data = {targetRoom,roomList:[]}
        return this.AddTask("travel","default",data,groupsNum,changeable,silence,getRepeat)
    },
    AddSpawnTask(role,components,groupType,groupName,boostCompounds,salt = undefined,subTaskType = "default"){
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
        return this.AddTask("spawn",subTaskType,data,1,false,false,false)
    }
}

_.assign(Room.prototype,roomTaskExtension)