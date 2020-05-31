/**
 * @module  Intelligence
 * @see     module:2.0.0/utils
 */

const utils         = require('utils');
const taskPriority  = require('configuration.TaskPriority');
const configTower   = require('configuration.Tower');

/** 
 * @class Class of the "task" part of Intelligence.
*/
class Intelligence_task {
    static NOT_REFRESH_TASK_LIST = ["spawn","_spawn","harvest","_harvest","defend","_defend","attack","_attack","info"];
    static NOT_REFRESH_SUBTASK = {"transfer":["remote"],"_transfer":["remote"]};
    /**
     * Splice the task from the task-pool Array.
     * @param {String} roomName 
     * @param {String} taskType 
     * @param {String} fingerprint 
     * @returns {Boolean} Indicate whether successful.
     */
    _spliceTask(roomName,taskType,fingerprint) {
        if (!this.checkTask(roomName,fingerprint)) return false;
        const _pos = Memory.task[roomName][taskType].indexOf(fingerprint);
        // Ensure the task is in the list.
        if (_pos < 0) return false;
        // Splice the task.
        Memory.task[roomName][taskType].splice(_pos,1);
        return true;
    }
    /**
     * Refresh the tasks.
     * @param {String} roomName The name of room which task mounts.
     */
    refreshTask(roomName){
        // Deal with the edge cases.
        if (!Memory.task.info[roomName]) return false;
        // Filter out the tasks.
        for (const taskType in Memory.task[roomName]){
            // Not refresh tasks.
            if (Intelligence_task.NOT_REFRESH_TASK_LIST.indexOf(taskType) >= 0) continue;
            let filteredList = [];
            for (const fingerprint of Memory.task[roomName][taskType]){
                // In case of deleting from taskType, but still in _taskType.
                if (!this.checkTask(roomName,fingerprint)) continue;
                const info = this.taskInfo(roomName,fingerprint);
                // Filter.
                if (Intelligence_task.NOT_REFRESH_SUBTASK[taskType] && Intelligence_task.NOT_REFRESH_SUBTASK[taskType].indexOf(info.subTaskType) >= 0) filteredList.push(fingerprint);
                else delete Memory.task[roomName].info[fingerprint];
            }
            // Reset.
            Memory.task[roomName][taskType] = filteredList;
        }
        const refreshTaskCnt = (roomName,fingerprint)=>{
            const info = this.taskInfo(roomName,fingerprint);
            // In case after refreshing, the key does not exists.
            Memory.task[roomName][info.taskType] = Memory.task[roomName][info.taskType] || [];
            // Repush to the task-pool.
            if (info.settings.waitingGroupsNum === 0) Memory.task[roomName][info.taskType].push(fingerprint);
            // Reset number.
            info.settings.waitingGroupsNum = info.settings.allGroupsNum;
            info.settings.workingGroupsNum = 0;
        }
        for (const fingerprint in Memory.task.info[roomName]) refreshTaskCnt(roomName,fingerprint);
        for (const creep of Game.rooms[roomName].creeps) creep.memory.taskFingerprint = null;
    }
    /**
     * Clear the tasks.
     * @param {String} roomName The name of room which task mounts.
     * @param {...String} taskTypes Clear taskTypes, allowing for "all" indicating all the taskTypes.
     */
    clearTask(roomName,...taskTypes){
        taskTypes = taskTypes || ["all"];
        if (taskTypes.indexOf("all") >= 0){
            Memory.task.info[roomName] = {};
            Memory.task[roomName] = {};
            for (const creep in Game.creeps) Memory.creeps[creep].taskFingerprint = null;
            for (const spawn in Game.spawns) Memory.spawns[spawn].taskFingerprint = null;
        }else{
            for (const fingerprint of Memory.task.info[roomName]) {
                const info = Memory.task.info[roomName][fingerprint];
                if (taskTypes.indexOf(info.taskType) >= 0) delete Memory.task.info[roomName][fingerprint];
            }
            for (const taskType of taskTypes) {
                if (Memory.task[roomName][taskType]) delete Memory.task[roomName][taskType];
                if (Memory.task[roomName]["_" + taskType]) delete Memory.task[roomName]["_" + taskType];
            }
        }
    }
    /**
     * Get the task Info.
     * @param   {String} home           The home which task mounts.
     * @param   {String} fingerprint    The expected fingerprint of the task.
     * @returns {Object|undefined} Task Info, or undefined, if not exists.
     */
    taskInfo(home,fingerprint) {
        if (!this.checkTask(home,fingerprint)) return undefined;
        return Memory.task.info[home][fingerprint];
    }
    /**
     * Check the existence of task.
     * @param   {String} roomName       The name of the room which task mounts.
     * @param   {String} fingerprint    The fingerprint of the task.
     * @returns {Boolean} True or False, indicating whether exists.
     */
    checkTask(roomName,fingerprint) {
        if (Memory.task.info[roomName][fingerprint]) return true;
        return false;
    }
    /**
     * Finish the task.
     * @param {String} roomName The name of the room which task mounts.
     * @param {String} fingerprint The fingerprint of the task.
     */
    finishTask(roomName,fingerprint) {
        if (!this.checkTask(roomName,fingerprint)) return false;
        const info = this.taskInfo(home,fingerprint);
        info.settings.workingGroupsNum--;
        if (info.settings.workingGroupsNum === 0 && info.settings.waitingGroupsNum === 0) this.deleteTask(roomName,fingerprint);
        return true;
    }
    /**
     * Renew the task.
     * @param {String} roomName The name of the room which task mounts.
     * @param {String} fingerprint The fingerprint of the task.
     */
    renewTask(roomName,fingerprint) {
        if (!this.checkTask(roomName,fingerprint)) return false;
        const info = this.taskInfo(home,fingerprint);
        if (info.settings.waitingGroupsNum === 0) Memory.task[roomName][info.taskType].push(fingerprint);
        info.settings.workingGroupsNum--;
        info.settings.waitingGroupsNum++;
        return true;
    }
    /**
     * Delete the task.
     * @param {String} roomName The name of the room which task mounts.
     * @param {String} fingerprint The fingerprint of the task.
     */
    deleteTask(roomName,fingerprint) {
        if (!this.checkTask(roomName,fingerprint)) return false;
        const taskType = this.taskInfo(home,fingerprint).taskType;
        delete Memory.task.info[roomName][fingerprint];
        this._spliceTask(roomName,taskType,fingerprint);
        this._spliceTask(roomName,"_" + taskType,fingerprint);
    }
    /**
     * Sort the tasks.
     * @param   {String}  home                    The home which task mounts.
     * @param   {Object}  subject                 The subject of getting-task.
     * @param   {String}  taskType                The type of the Task.
     * @param   {Array}   taskList                The list of the Task.
     * @param   {Object}  settings                The setting of sorting the tasks.
     * @param   {Number}  settings.priorityLimit  The Upperbound of the priority(if has) of task, default is global.INFINITY.
     * @returns {Array} The sorted task list.
     */
    sortTask(home,subject,taskType,taskList,settings = {priorityLimit:INFINITY}){
        switch (taskType) {
            case "spawn":
                taskList = _.filter(taskList,f => {                     // Filter the task has priority and below the upper-bound.
                    const _info = this.taskInfo(home,f).data.memory;
                    try {
                        return taskPriority["spawn"][_info.role][_info.group.type] <= settings.priorityLimit;
                    } catch (error) {
                        return false;
                    }
                }).sort((f1,f2)=>{                                      // Sort the tasks based on the priority.
                    const _info1 = this.taskInfo(home,f1).data.memory;
                    const _info2 = this.taskInfo(home,f2).data.memory;
                    return taskPriority["spawn"][_info1.role][_info1.group.type] - taskPriority["spawn"][_info2.info][_info2.group.type];
                });
                break;
            case "harvest":
                taskList.sort((f1,f2)=>{
                    const targetPos1 = this.taskInfo(home,f1).data.target.targetPos;
                    const targetPos2 = this.taskInfo(home,f2).data.target.targetPos;
                    const range1 = (new RoomPosition(targetPos1.x,targetPos1.y,targetPos1.roomName)).getRangeTo(subject);
                    const range2 = (new RoomPosition(targetPos2.x,targetPos2.y,targetPos2.roomName)).getRangeTo(subject);
                    return range1 - range2;
                });
                break;
            default:
                break;
        }
        return taskList
    }
    /**
     * Get the task.
     * @param   {String}        home            The home which task mounts.
     * @param   {Object}        subject         The subject of getting-task.
     * @param   {String}        taskType        The type of the Task.
     * @param   {String|Array}  subTaskTypes    Acceptable sub-taskTypes, allowing for "all", which has literal meaning.
     * @param   {Object}        settings        The setting of getting a task.
     * @param   {Boolean}       settings.dry    Whether try to get a task.
     * @param   {Number}        settings.priorityLimit  The Upperbound of the priority(if has) of task, default is global.INFINITY.
     * @returns {String|undefined|Boolean} The fingerprint of task-info, or undefined, if not found, or True, if found and dry.
     */
    getTask(home,subject,taskType,subTaskTypes,settings = {dry:false,priorityLimit:INFINITY}) {
        // Setting and Dealing with the edge cases.
        _.defaults(settings,{dry:false,priorityLimit:INFINITY});
        if (!Memory.task[home] || !Memory.task[home][taskType] || Memory.task[home][taskType].length === 0) return undefined;
        // Filter out the taskList.
        let taskList = [...Memory.task[home][taskType]];
        if (subTaskType !== "all") taskList = _.filter(taskList,(f)=>subTaskTypes.indexOf(this.taskInfo(f).subTaskType) >= 0);
        // Return, if dry or no available.
        if (taskList.length === 0) return undefined;
        if (settings.dry)          return true;
        // Sort the taskList.
        taskList = this.sortTask(home,subject,taskType,taskList,{priorityLimit:settings.priorityLimit});
        // Return the task.
        const fingerprint = taskList[0];
        const info = this.taskInfo(home,fingerprint);
        info.settings.waitingGroupsNum--;
        info.settings.workingGroupsNum++;
        if (info.settings.waitingGroupsNum === 0) this._spliceTask(home,taskType,fingerprint);
        return fingerprint;
    }
    /**
     * Add the task into the timeLine.
     * @param   {Number}    tick     The tick when the task happened.
     * @param   {Object}    func     The function which will be executed.
     * @param   {Array}     params   The params passed into the function.
     * @returns {Number}    OK, indicating successful or error code.
     */
    addScheduledTask(tick,func,params){
        if (tick < Game.time) return ERR_WRONG_TIME;

        if (!global.timeLine[tick]) global.timeLine[tick] = [];
        global.timeLine[tick].push({func,params});
        return OK;
    }
    /**
     * Add the Task.
     * @param   {String}    roomName            The name of the hosting room.
     * @param   {String}    taskType            The type of the task.
     * @param   {String}    subTaskType         The subType of the task.
     * @param   {Object}    data                The data of the task.
     * @param   {Object}    settings            The settings of the task.
     * @param   {Number}    settings.groupsNum  The expected running-groups number, default is 1.
     * @param   {Boolean}   settings.changeable Whether this task is changeable, default is true.
     * @returns {Number}    OK, indicating successful or error code.
     */
    addTask(roomName,taskType,subTaskType = "",data = {},settings = {groupsNum:1,changeable:true}){
        _.defaults(settings,{groupsNum:1,changeable:true});
        Memory.task[roomName]               = Memory.task[roomName] || {};
        Memory.task.info[roomName]          = Memory.task.info[roomName] || {};
        Memory.task[roomName][taskType]     = Memory.task[roomName][taskType] || [];
        Memory.task[roomName]["_"+taskType] = Memory.task[roomName]["_" + taskType] || [];
        
        const fingerprint = utils.getTaskFingerprint({taskType,subTaskType,data});
        if (this.checkTask(roomName,fingerprint)) return ERR_TASK_EXISTS;

        const _settings = {
            waitingGroupsNum:settings.groupsNum,
            workingGroupsNum:0,
            allGroupsNum    :settings.groupsNum,
            changeable      :settings.changeable,
        }
        Memory.task.info[roomName][fingerprint] = {taskType,subTaskType,data,settings:_settings};
        Memory.task[roomName][taskType].push(fingerprint);
        Memory.task[roomName]["_"+taskType].push(fingerprint);
        return OK;
    }
    /**
     * Add the Spawn Task.
     * @param   {String}  home            The home of the creep.
     * @param   {String}  role            The role of the creep.
     * @param   {Array}   components      The expected components of the creep.
     * @param   {Object}  group           Group Object, including name and type.
     * @param   {Array}   boostCompounds  Compounds allowed to be implemented on this creep. 
     * @param   {Number}  salt            Salt, in order to duplicate.
     * @returns {Number}    OK, indicating successful or error code.
     */
    addSpawnTask(home,role,components,group,boostCompounds = [],salt = 0){
        _.defaults(group,{name:null,type:null});
        const memory = {home,role,components,group,boostCompounds,salt};
        return this.addTask(home,"spawn","default",{memory});
    }
    /**
     * Add the Transfer Task.
     * @param   {String}            home                The home of creeps which the task is expected to perform by.
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
    addTransferTask(home,subTaskType,from,to,resourceType,amount = "full",complements = {},settings = {groupsNum:1,changeable:true}){
        _.defaults(settings,{groupsNum:1,changeable:true});
        return this.addTask(home,"transfer",subTaskType,{from,to,resourceType,amount,complements},settings);
    }
    /**
     * Add the Harvest Task.
     * @param   {String}    home                The home of creeps which the task is expected to perform by.
     * @param   {String}    subTaskType         sub-taskType of "harvest" task.
     * @param   {Object}    target              The target of harvest behavior.
     * @param   {String}    target.targetId     The Id of the harvesting target.
     * @param   {Object}    target.targetPos    The pos of the harvesting target, expecting to be an Object has x,y,roomName.
     * @param   {Object}    settings            The settings of the task.
     * @param   {Number}    settings.groupsNum  The expected running-groups number, default is 1.
     * @param   {Boolean}   settings.changeable Whether this task is changeable, default is false.
     * @returns {Number}    OK, indicating successful or error code.
     */
    addHarvestTask(home,subTaskType,target,settings = {groupsNum:1,changeable:false}){
        _.defaults(settings,{groupsNum:1,changeable:false});
        const _target = {
            targetId:target.targetId,
            targetPos:{
                x       :target.targetPos.x,
                y       :target.targetPos.y,
                roomName:target.targetPos.roomName,
            }
        };
        return this.addTask(home,"harvest",subTaskType,{target:_target},settings);
    }
    /**
     * Add the Build Task.
     * @param   {String}    home                The home of creeps which the task is expected to perform by.
     * @param   {String}    subTaskType         sub-taskType of "build" task.
     * @param   {Object}    target              The target of build behavior.
     * @param   {String}    target.target       The specific target of build behavior, expecting Id or "buildTargets"(default), which will lead the Intelligence to search in Room.buildTargets.
     * @param   {String}    target.roomName     The room where the target lies, default is home.
     * @param   {Object}    settings            The settings of the task.
     * @param   {Number}    settings.groupsNum  The expected running-groups number, default is 1.
     * @param   {Boolean}   settings.changeable Whether this task is changeable, default is true.
     * @returns {Number}    OK, indicating successful or error code.
     */
    addBuildTask(home,subTaskType,target = {target:"buildTargets",roomName:home},settings = {groupsNum:1,changeable:true}){
        _.defaults(settings,{groupsNum:1,changeable:true});
        _.defaults(target,{target:"buildTargets",roomName:home});
        return this.addTask(home,"build",subTaskType,{target},settings);
    }
    /**
     * Add the Repair Task.
     * @param   {String}    home                The home of creeps which the task is expected to perform by.
     * @param   {String}    subTaskType         sub-taskType of "repair" task.
     * @param   {Object}    target              The target of repair behavior.
     * @param   {String}    target.target       The specific target of repair behavior, expecting Id or "repairTargets"(default), which will lead the Intelligence to search in Room.repairTargets.
     * @param   {String}    target.roomName     The room where the target lies, default is home.
     * @param   {Object}    settings            The settings of the task.
     * @param   {Number}    settings.groupsNum  The expected running-groups number, default is 1.
     * @param   {Boolean}   settings.changeable Whether this task is changeable, default is true.
     * @returns {Number}    OK, indicating successful or error code.
     */
    addRepairTask(home,subTaskType,target = {target:"repairTargets",roomName:home},settings = {groupsNum:1,changeable:true}){
        _.defaults(settings,{groupsNum:1,changeable:true});
        _.defaults(target,{target:"repairTargets",roomName:home});
        return this.addTask(home,"repair",subTaskType,{target},settings);
    }
    /**
     * Add the Pickup Task.
     * @param   {String}    home                The home of creeps which the task is expected to perform by.
     * @param   {String}    subTaskType         sub-taskType of "pickup" task.
     * @param   {Object}    target              The target of pickup behavior.
     * @param   {String}    target.target       The specific target of pickup behavior, expecting Id or "droppedResources"(default), which will lead the Intelligence to search in Room.droppedResources.
     * @param   {String}    target.roomName     The room where the target lies, default is home.
     * @param   {Object}    settings            The settings of the task.
     * @param   {Number}    settings.groupsNum  The expected running-groups number, default is 1.
     * @param   {Boolean}   settings.changeable Whether this task is changeable, default is true.
     * @returns {Number}    OK, indicating successful or error code.
     */
    addPickupTask(home,subTaskType,target = {target:"droppedResources",roomName:home},settings = {groupsNum:1,changeable:true}){
        _.defaults(target,{target:"droppedResources",roomName:home});
        _.defaults(settings,{groupsNum:1,changeable:true});
        return this.addTask(home,"pickup",subTaskType,{target},settings);
    }
    /**
     * Add the Upgrade Task.
     * @param   {String} home The home of creeps which the task is expected to perform by.
     * @param   {Number} salt In order to create and differentiate duplicate tasks to boost Upgrade.
     * @returns {Number}    OK, indicating successful or error code.
     */
    addUpgradeTask(home,salt = 0) {
        return this.addTask(home,"upgrade","default",{salt,target:{target:Game.rooms[home].controller.id,roomName:home}},{groupsNum:INFINITY,changeable:true});
    }
    /**
     * Add the Travel Task.
     * @param   {String}        home    The home of creeps which the task is expected to perform by.
     * @param   {String|Array}  targets The targets of travel behavior. Can be roomName, roomName List, or a string containing many roomNames which are divided by '|'.
     * @returns {Number}    OK, indicating successful or error code.
     */
    addTravelTask(home,targets) {
        if (typeof(targets) === "string") targets = targets.split('|');
        if (targets.length === 0) return ERR_INVALID_ARGS;
        return this.addTask(home,"travel","default",{roomList:[],targetRooms:targets},{groupsNum:1,changeable:false});
    }
    /**
     * Add the Attack Task.
     * @param   {String}    home                The home of creeps which the task is expected to perform by.
     * @param   {String}    subTaskType         sub-taskType of "attack" task.
     * @param   {String}    targetRoom          The targetRoom of "attack" task.
     * @param   {Array}     routes              An array of roomNames, in order to control the route.
     * @param   {Object}    settings            The settings of the task.
     * @param   {Number}    settings.groupsNum  The expected running-groups number, default is 1.
     * @param   {Boolean}   settings.changeable Whether this task is changeable, default is false.
     * @returns {Number}    OK, indicating successful or error code.
     */
    addAttackTask(home,subTaskType,targetRoom,routes = [],settings = {groupsNum:1,changeable:false}){
        _.defaults(settings,{groupsNum:1,changeable:false});
        return this.addTask(home,"attack",subTaskType,{targetRoom,routes},settings);
    }
    /**
     * Add the Defend Task.
     * @param   {String}    home                The home of creeps which the task is expected to perform by.
     * @param   {String}    subTaskType         sub-taskType of "defend" task.
     * @param   {String}    targetRoom          The targetRoom of "defend" task.
     * @param   {Array}     routes              An array of roomNames, in order to control the route.
     * @param   {Object}    settings            The settings of the task.
     * @param   {Number}    settings.groupsNum  The expected running-groups number, default is 1.
     * @param   {Boolean}   settings.changeable Whether this task is changeable, default is false.
     * @returns {Number}    OK, indicating successful or error code.
     */
    addDefendTask(home,subTaskType,targetRoom,routes = [],settings = {groupsNum:1,changeable:false}){
        _.defaults(settings,{groupsNum:1,changeable:false});
        return this.addTask(home,"defend",subTaskType,{targetRoom,routes},settings);
    }
    /**
     * Issue the initial tasks after being refreshed.
     */
    initTasks(){

    }
    /**
     * Run.
     * @param   {Object}    settings                    The setting of the function.
     * @param   {Number}    settings.maxIteration       The maximum executing Task.
     * @param   {Boolean}   settings.allowPostpone      Whether allow unexecuted tasks to be postponed.
     */
    runScheduled(settings = {maxIteration : 2000,allowPostpone : false}){
        _.defaults(settings,{maxIteration : 2000,allowPostpone : false});
        // In case no task available.
        if (!global.timeLine[Game.time]) return true;
        // Running the tasks.
        let cnt = 0;
        while (global.timeLine[Game.time].length > 0 && cnt < settings.maxIteration) {
            cnt++;
            let event       = global.timeLine[Game.time].shift();
            let feedback    = event.func.call(...params);
            
        }
        // Deal with the remaining tasks.
        if (settings.allowPostpone && cnt === settings.maxIteration) {
            while (global.timeLine[Game.time].length > 0) {
                let event = global.timeLine[Game.time].shift();
                this.addScheduledTask(event.tick + 1,event.func,event.params);
            }
        }
        // Clean out.
        delete global.timeLine[Game.time];
        return true;
    }
    constructor() {

    }
}
/**
 * @class Class of the "init" part of Intelligence.
 */
class Intelligence_init {
    static LINK_CATEGORIES              = ["resources","upgrade","charges"];
    static RESOURCE_CHECK_STRUCTURES    = ["labs","storage","terminal","containers","factory"];
    /**
     * Scan the room and mount to the global.info.rooms.
     */
    scanRoom(){
        global.info.rooms           =   {};
        global.info.rooms.my        =   _.filter(Game.rooms,room => utils.roomState(room.name) === "my").map(r => r.name);
        global.info.rooms.reserved  =   _.filter(Game.rooms,room => utils.roomState(room.name) === "reserved").map(r => r.name);
        global.info.rooms.central   =   _.filter(Game.rooms,room => utils.roomState(room.name) === "central").map(r => r.name);
        global.info.rooms.highway   =   _.filter(Game.rooms,room => utils.roomState(room.name) === "highway").map(r => r.name);
    }
    /**
     * Scan the links and mount to the global.info.links.
     */
    scanLink(){
        const _checkLinkCache = function() {
            if (global.info.links) return;
            global.info.links = {};
            for (let roomName of global.info.rooms.my) {
                global.info.links[roomName] = {map:{},};
                Intelligence_init.LINK_CATEGORIES.forEach(element => global.info.links[roomName][element] = []);

                for (let link of Game.rooms[roomName].links) {
                    const energyAdjacent              =   utils.Adjacent(2,link,Game.rooms[roomName]["energys"]);
                    const controllerStrongAdjacent    =   utils.Adjacent(1,link,Game.rooms[roomName].controller);
                    const storeAdjacent               =   utils.Adjacent(2,link,Game.rooms[roomName].storage,Game.rooms[roomName].terminal,...Game.rooms[roomName].spawns);
                    if (controllerStrongAdjacent) global.info.links[roomName].upgrade.push(link.id);
                    else if (energyAdjacent)   {
                        global.info.links[roomName].resources.push(link.id);
                        global.info.links[roomName].map[energyAdjacent.id] = link.id;
                    }else if (storeAdjacent) global.info.links[roomName].charges.push(link.id);
                    else global.info.links[roomName].upgrade.push(link.id);
                }
            }
            return;
        };
        const _checkLinkValid = function() {
            if (!global.info.links) return;
            for (let roomName of global.info.rooms.my) {
                if (!global.info.links[roomName]) continue;
                for (let category of Intelligence_init.LINK_CATEGORIES) global.info.links[roomName][category] = _.filter(global.info.links[roomName][category],l => Game.getObjectById(l));
                for (let energyId in global.info.links[roomName].map) {
                    if (global.info.links[roomName].resources.indexOf(global.info.links[roomName].map[energyId]) < 0) {
                        delete global.info.links[roomName].map[energyId];
                    }
                }
            }
            return;
        }
        _checkLinkCache();
        _checkLinkValid();
        for (let roomName of global.info.rooms.my) {
            if (!global.info.links[roomName]) continue;
            for (let category of Intelligence_init.LINK_CATEGORIES) {
                global.info.links[roomName][category].sort((linkAId,linkBId)=>Game.getObjectById(linkBId).store[RESOURCE_ENERGY] - Game.getObjectById(linkAId).store[RESOURCE_ENERGY]);
            }
        }
    }
    /**
     * Scan the containers and mount to the global.info.containers.
     */
    scanContainer(){
        const _checkContainerCache = function() {
            if (global.info.containers) return;
            global.info.containers = {};
            // Let all the rooms which have the potential to have containers for usage to be taken into account.
            for (let roomName of [].concat(global.info.rooms.my,global.info.rooms.reserved,global.info.rooms.central)) {
                global.info.containers[roomName] = {map:{},resources:[],mineral:null};
                for (let container of Game.rooms[roomName].containers) {
                    const energyAdjacent     =   utils.Adjacent(1,container,Game.rooms[roomName]["energys"]);
                    const mineralAdjacent    =   utils.Adjacent(1,container,Game.rooms[roomName]["mineral"]);
                    if (energyAdjacent) {
                        global.info.containers.resources.push(container.id);
                        global.info.containers[roomName].map[energyAdjacent.id] = container.id;
                    }else if (mineralAdjacent){
                        global.info.containers.mineral = container.id;
                        global.info.containers[roomName].map[mineralAdjacent.id] = container.id;
                    }
                }
            }
            return;
        }
        const _checkContainerValid = function() {
            if (!global.info.containers) return;
            for (let roomName of [].concat(global.info.rooms.my,global.info.rooms.reserved,global.info.rooms.central)) {
                global.info.containers[roomName].resources = _.filter(global.info.containers[roomName].resources,c => Game.getObjectById(c));
                if (!Game.getObjectById(global.info.containers[roomName].mineral)) global.info.containers[roomName].mineral = null;
                for (let resourceId in global.info.containers[roomName].map) {
                    let containerId = global.info.containers[roomName].map[resourceId];
                    if (global.info.containers[roomName].resources.indexOf(containerId) < 0 && global.info.containers[roomName].mineral !== containerId) {
                        delete global.info.containers[roomName].map[resourceId];
                    }
                }
            }
            return;
        }
        _checkContainerCache();
        _checkContainerValid();
        for (let roomName of [].concat(global.info.rooms.my,global.info.rooms.reserved,global.info.rooms.central)) {
            global.info.containers[roomName].resources.sort((containerAId,containerBId)=>Game.getObjectById(containerBId).store.getUsedCapacity() - Game.getObjectById(containerAId).store.getUsedCapacity());
        }
    }
    /**
     * Scan the resource info and mount to the global.info.resources.
     */
    scanResource(){
        for (var roomName of global.info.rooms.my) {
            global.info.resources[roomName] = {};
            // Collect the information.
            for (let structureName of Intelligence_init.RESOURCE_CHECK_STRUCTURES) {
                let structureArr = Game.rooms[roomName][structureName];
                if (structureName.charAt(structureName.length - 1) !== "s") structureArr = [structureArr];
                for (let structure of structureArr) {
                    for (let carry in structure.store) {
                        global.info.resources[roomName][carry]                   =  global.info.resources[roomName][carry] || {};
                        global.info.resources[roomName][carry][structureName]    =  global.info.resources[roomName][carry][structureName] || 0;
                        global.info.resources[roomName][carry][structureName]    += structure.store[carry];
                    }
                }
            }

            // Group the information.
            for (let resource in global.info.resources[roomName]) {
                global.info.resources[roomName]["total"]    =   0;
                global.info.resources[roomName]["utils"]    =   0;
                for (let structureName of Intelligence_init.RESOURCE_CHECK_STRUCTURES) {
                    global.info.resources[roomName][resource][structureName]     =   global.info.resources[roomName][roomName][resource][structureName] || 0;
                    global.info.resources[roomName][resource]["total"]           +=  global.info.resources[roomName][resource][structureName];
                    if (structureName !== "labs")   global.info.resources[roomName][resource]["utils"] += global.info.resources[roomName][resource][structureName];
                }
            }
        }
    }
    /**
     * Analyse the structures of labs.
     */
    analyseLabStructure(){
        if (global.info.labStructures) return;
        for (let roomName of global.info.rooms.my){
            global.info.labStructures[roomName] = {
                core:[],
                others:[],
            }
            if (Game.rooms[roomName].labs.length === 0) continue;
            const minX = Math.min(...Game.rooms[roomName].labs.map((object)=>object.pos.x));
            const maxX = Math.max(...Game.rooms[roomName].labs.map((object)=>object.pos.x));
            const minY = Math.min(...Game.rooms[roomName].labs.map((object)=>object.pos.y));
            const maxY = Math.max(...Game.rooms[roomName].labs.map((object)=>object.pos.y));
            // Filter out the labs belong to 'others'.
            global.info.labStructures[roomName]["others"].push(_.filter(Game.rooms[roomName].labs,(lab)=>lab.pos.x === minX || lab.pos.y === minY).map(l => l.id));
            if (maxX - minX >= 3) global.info.labStructures[roomName]["others"].push(_.filter(Game.rooms[roomName].labs,(lab)=>lab.pos.x === maxX)).map(l => l.id);
            if (maxY - minY >= 3) global.info.labStructures[roomName]["others"].push(_.filter(Game.rooms[roomName].labs,(lab)=>lab.pos.y === maxY)).map(l => l.id);
            // Adjust the range of pos of the labs.
            const [minXX,minYY,maxXX,maxYY] = [minX + 1,minY + 1,maxX - 1,maxY - 1];
            if (maxX - minX < 3) maxXX = maxX;
            if (maxY - minY < 3) maxYY = maxY;
            // Filter out the labs belong to 'core'.
            global.info.labStructures[roomName]["core"] = _.filter(Game.rooms[roomName].labs,(lab)=> lab.pos.x >= minXX && lab.pos.x <= maxXX && lab.pos.y >= minYY && lab.pos.y<=maxY).map(l => l.id);
        }
    }
    /**
     * Scan the labs and mount to the global.info.labs.
     */
    scanLab(){
        global.info.labs = {};
        for (let roomName of global.info.rooms.my) {
            global.info.labs[roomName] = {};
            if (Game.rooms[roomName].labs.length > 0){
                for (let labId of global.info.labStructures[roomName]["others"]){
                    const lab           = Game.getObjectById(labId);
                    let   mineralType   = lab.mineralType;
                    if (!mineralType) mineralType = "vacant";
                    if (!global.info.labs[roomName][mineralType]) global.info.labs[roomName][mineralType] = [];
                    global.info.labs[roomName][mineralType].push(lab);
                }
                for (let mineralType in global.info.labs[roomName]) {
                    if (mineralType === "vacant") continue;
                    global.info.labs[roomName][mineralType].sort((labA,labB)=>labB.store[mineralType] - labA.store[mineralType]);
                }
            }
        }
    }
    /**
     * Scan the need-repair targets of tower-standard and mount to the global.info.repairTargets.
     */
    scanRepairTarget(){
        global.info.repairTargets   =   {};
        for (let roomName of global.info.rooms.my) {
            const roads         = _.filter(Game.rooms[roomName].roads,r => r.hits/r.hitsMax <= configTower.road).map(r => r.id);
            const containers    = _.filter(Game.rooms[roomName].containers,c => c.hits/c.hitsMax <= configTower.container).map(c=>c.id);
            const roomLevel     = Game.rooms[roomName].controller.level;
            const walls         = _.filter(Game.rooms[roomName].constructedWalls,w=>w.hits/w.hitsMax <= configTower.wall[roomLevel]).map(w => w.id);
            const ramparts      = _.filter(Game.rooms[roomName].ramparts,r => r.hits/r.hitsMax <= configTower.rampart[roomLevel]).map(r => r.id);
            global.info.repairTargets[roomName] = {
                common:[].concat(roads,containers),
                walls,ramparts,
            }
        }
    }
    /**
     * Run.
     */
    run(){
        this.scanRoom();
        this.scanLink();
        this.scanContainer();
        this.scanResource();
        this.scanRepairTarget();

        this.analyseLabStructure();
        this.scanLab();
    }
    constructor() {}
}
/**
 * @class Class of Intelligence.
 */
class Intelligence{
    constructor() {
        this.init = new Intelligence_init();
        this.task = new Intelligence_task();
    }
}