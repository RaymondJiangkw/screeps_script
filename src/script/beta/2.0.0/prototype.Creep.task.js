const creepConfig = require('configuration.Creep')
module.exports = function(){
    _.assign(Creep.prototype,creepTaskExtension)
}
const creepTaskExtension = {
    isIdle(){
        if (!this.memory.taskFingerprint) return true
        return false
    },
    initTask(){
        const taskInfo = Game.rooms[this.memory.home].taskInfo(this.memory.taskFingerprint)
        if (!taskInfo.targetID || !taskInfo.targetPos) {
            if (taskInfo.data.targetID === "build"){
                taskInfo.targetID = Game.rooms[this.memory.home].buildTargets[0].id
            }else if (taskInfo.data.targetID === "repair"){
                taskInfo.targetID = Game.rooms[this.memory.home].repairTargets[0].id
            }else taskInfo.targetID = taskInfo.data.targetID
            if (taskInfo.data.targetPos) taskInfo.targetPos = taskInfo.data.targetPos
            else if (Game.getObjectById(taskInfo.targetID)) taskInfo.targetPos = Game.getObjectById(taskInfo.targetID).pos
        }
    },
    getTask(check = false){
        const groupType = this.memory.group.type
        const acceptedTasks = creepConfig.groupAcceptedTask[groupType][this.memory.role]
        for (var acceptedTask of acceptedTasks){
            if (acceptedTask[0] === "-") continue
            var taskProperty = acceptedTask.split('-')
            if (!taskProperty[1]) taskProperty[1] = "all";
            else taskProperty[1] = taskProperty[1].split('|');
            var fingerprint = Game.rooms[this.memory.home].getTask(taskProperty[0],taskProperty[1],check = check)
            if (fingerprint !== undefined) {
                if (check) return true
                else this.memory.taskFingerprint = fingerprint
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