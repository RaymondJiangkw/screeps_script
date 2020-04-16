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
            taskInfo.targetID = taskInfo.data.targetID
            if (taskInfo.data.targetPos) taskInfo.targetPos = taskInfo.data.targetPos
            else taskInfo.targetPos = Game.getObjectById(taskInfo.data.targetID).pos
        }
    },
    getTask(){
        const groupType = this.memory.group.type
        const acceptedTasks = creepConfig.groupAcceptedTask[groupType][this.memory.role]
        for (var acceptedTask of acceptedTasks){
            var taskProperty = acceptedTask.split('-')
            if (!taskProperty[1]) taskProperty[1] = "all";
            else taskProperty[1] = taskProperty[1].split('|');
            var fingerprint = Game.rooms[this.memory.home].getTask(taskProperty[0],taskProperty[1])
            if (fingerprint !== undefined) {
                this.memory.taskFingerprint = fingerprint
                break
            }
        }
    },
    renewTask(){
        Game.rooms[this.memory.home].renewTask(this.memory.taskFingerprint)
        this.memory.taskFingerprint = null
    },
    finishTask(){
        Game.rooms[this.memory.home].finishTask(this.memory.taskFingerprint)
        this.memory.taskFingerprint = null
    }
}