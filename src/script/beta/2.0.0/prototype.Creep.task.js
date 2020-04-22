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
                if (Game.rooms[this.memory.home].buildTargets.length > 0) taskInfo.targetID = Game.rooms[this.memory.home].buildTargets[0].id
            }else if (taskInfo.data.targetID === "repair"){
                if (Game.rooms[this.memory.home].repairTargets.length > 0) taskInfo.targetID = Game.rooms[this.memory.home].repairTargets[0].id
            }else taskInfo.targetID = taskInfo.data.targetID
            if (taskInfo.data.targetPos) taskInfo.targetPos = taskInfo.data.targetPos
            else if (Game.getObjectById(taskInfo.targetID)) taskInfo.targetPos = Game.getObjectById(taskInfo.targetID).pos
        }
    },
    getTask(dry = false){
        const groupType = this.memory.group.type
        const acceptedTasks = creepConfig.groupAcceptedTask[groupType][this.memory.role]
        for (var i = 0; i < acceptedTasks.length; i++){
            var acceptedTask = acceptedTasks[i]
            if (acceptedTask[0] === "-") continue
            if (acceptedTask[0] === "*") acceptedTask = acceptedTask.slice(1)
            var taskList = utils.analyseTaskList(acceptedTask,"all")
            
            var fingerprint = Game.rooms[this.memory.home].getTask(taskList[0],taskList[1],dry = dry)
            
            if (fingerprint) {
                if (dry) {
                    if (acceptedTasks[i][0] === "*") return false
                    else return true
                }else this.memory.taskFingerprint = fingerprint
                break
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