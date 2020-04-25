const creepConfig = require('configuration.Creep')
const utils = require('utils')
module.exports = function(){
    _.assign(Creep.prototype,creepTaskExtension)
}
const creepTaskExtension = {
    isIdle(){
        if (!this.memory.taskFingerprint) return true
        if (!Game.rooms[this.memory.home].checkTaskExistence(this.memory.taskFingerprint)){
            this.deleteTask()
            return true
        }
        return false
    },
    initTask(){
        const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
        if (!taskInfo.targetID || !taskInfo.targetPos) {
            if (taskInfo.data.targetID === "build"){
                if (taskInfo.subTaskType == "local" && Game.rooms[this.memory.home].buildTargets.length > 0) taskInfo.targetID = Game.rooms[this.memory.home].buildTargets[0].id
                try {
                    if (taskInfo.subTaskType == "remote" && Game.rooms[taskInfo.data.targetPos.roomName].buildTargets.length > 0) taskInfo.targetID = Game.rooms[taskInfo.data.targetPos.roomName].buildTargets[0].id
                } catch (error) {}
            }else if (taskInfo.data.targetID === "repair"){
                if (taskInfo.subTaskType == "local" && Game.rooms[this.memory.home].repairTargets.length > 0) taskInfo.targetID = Game.rooms[this.memory.home].repairTargets[0].id
                try {
                    if (taskInfo.subTaskType == "remote" && Game.rooms[taskInfo.data.targetPos.roomName].repairTargets.length > 0) taskInfo.targetID = Game.rooms[taskInfo.data.targetPos.roomName].repairTargets[0].id
                } catch (error) {}
            }else if (taskInfo.data.targetID === "pickUp"){
                if (taskInfo.subTaskType === "local" && Game.rooms[this.memory.home].droppedResources.length > 0) taskInfo.targetID = Game.rooms[this.memory.home].droppedResources[0].id
                try {
                    if (taskInfo.subTaskType === "remote" && Game.rooms[taskInfo.data.targetPos.roomName].droppedResources.length > 0) taskInfo.targetID = Game.rooms[taskInfo.data.targetPos.roomName].droppedResources[0].id
                } catch (error) {}
            }else taskInfo.targetID = taskInfo.data.targetID
            if (taskInfo.data.targetPos && !taskInfo.data.targetPos.fake) taskInfo.targetPos = taskInfo.data.targetPos
            else if (Game.getObjectById(taskInfo.targetID)) taskInfo.targetPos = Game.getObjectById(taskInfo.targetID).pos
            else if (taskInfo.data.targetPos && taskInfo.data.targetPos.fake) taskInfo.targetPos = taskInfo.data.targetPos
        }
    },
    getTask(dry = false){
        const groupType = this.memory.group.type
        const acceptedTasks = creepConfig.groupAcceptedTask[groupType][this.memory.role]
        var majorTasks = _.filter(acceptedTasks,(t)=>t.charAt(0) != "-" && t.charAt(0) != "*")
        var auxiliaryTasks = _.filter(acceptedTasks,(t)=>t.charAt(0) == "*")
        for (var majorTask of majorTasks){
            var taskList = utils.analyseTaskList(majorTask,"all")
            var fingerprint = Game.rooms[this.memory.home].getTask(this,taskList[0],taskList[1],dry = dry)
            if (fingerprint){
                if (dry) return true
                else this.memory.taskFingerprint = fingerprint
                break
            }
        }
        if (!this.memory.taskFingerprint){
            for (var auxiliaryTask of auxiliaryTasks){
                auxiliaryTask = auxiliaryTask.slice(1)
                var taskList = utils.analyseTaskList(auxiliaryTask,"all")
                var fingerprint = Game.rooms[this.memory.home].getTask(this,taskList[0],taskList[1],dry = dry)
                if (fingerprint){
                    if (dry) return false
                    else this.memory.taskFingerprint = fingerprint
                    break
                }
            }
        }
        return false
    },
    renewTask(){
        Game.rooms[this.memory.home].renewTask(this.memory.taskFingerprint)
        this.memory.taskFingerprint = null
    },
    finishTask(){
        Game.rooms[this.memory.home].finishTask(this.memory.taskFingerprint)
        this.memory.taskFingerprint = null
    },
    deleteTask(){
        Game.rooms[this.memory.home].deleteTask(this.memory.taskFingerprint)
        this.memory.taskFingerprint = null
    }
}