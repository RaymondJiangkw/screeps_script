const task = require('task.general')
module.exports = function (){
    _.assign(Creep.prototype,commonTaskExtension)
    _.assign(Spawn.prototype,commonTaskExtension)

    _.assign(Creep.prototype,CreepTaskExtension)
    _.assign(Spawn.prototype,SpawnTaskExtension)
}

const CreepTaskExtension = {
    isIdle(){
        if (!this.memory.taskInfo) return true
        if (!this.memory.taskInfo.taskType || !this.memory.taskInfo.taskID || !this.memory.taskInfo.taskPos) return true
        return false
    },
    renewTask(){
        task.renewTask(this.memory.taskInfo.taskType,this.memory.home,this.memory.taskInfo.taskID,this.memory.taskInfo.taskPos)
        this.memory.taskInfo.taskType = undefined
        this.memory.taskInfo.taskID = undefined
        this.memory.taskInfo.taskPos = undefined
    },
    getTaskTarget(){
        const _taskType = this.memory.taskInfo.taskType
        const _taskID = this.memory.taskInfo.taskID
        const _taskPos = this.memory.taskInfo.taskPos
        const pos = task.searchTask(_taskType,this.memory.home,_taskID,_taskPos)
        if (!Game.spawns['Origin'].memory.task[_taskType][this.memory.home].taskList[pos].target){
            let room = Game.spawns['Origin'].memory.task[_taskType][this.memory.home].taskList[pos].settings.targetRoom
            if (!room) room = this.memory.home
            const _structureType = Game.spawns['Origin'].memory.task[_taskType][this.memory.home].taskList[pos].data.structureType
            if (_structureType !== undefined) {
                let _object = undefined
                if (_structureType.charAt(_structureType.length - 1) === 's') _object = Game.rooms[room][_structureType][0]
                else  _object = Game.rooms[room][_structureType]
                if (_object){
                    Game.spawns['Origin'].memory.task[_taskType][this.memory.home].taskList[pos].target = _object.id
                    Game.spawns['Origin'].memory.task[_taskType][this.memory.home].taskList[pos].targetPos = _object.pos
                }
            }
        }
        return Game.spawns['Origin'].memory.task[_taskType][this.memory.home].taskList[pos]
    },
}
const SpawnTaskExtension = {
    isIdle(){
        if (this.spawning !== null) return false
        if (!this.memory.taskInfo) return true
        if (!this.memory.taskInfo.taskType || !this.memory.taskInfo.taskID || !this.memory.taskInfo.taskPos) return true
        return false
    },
}
const commonTaskExtension = {
    initTaskMemory(){
        if (!this.memory.taskInfo){
            this.memory.taskInfo = {
                taskType:undefined,
                taskID:undefined,
                taskPos:undefined
            }
        }
    },
    getTask(taskType){
        const ret = task.getTask(taskType,this.memory.home)
        if (ret !== undefined){
            this.memory.taskInfo.taskType = taskType
            this.memory.taskInfo.taskID = ret[0]
            this.memory.taskInfo.taskPos = ret[1]
        }
    },
    finishTask(){
        task.finishTask(this.memory.taskInfo.taskType,this.memory.home,this.memory.taskInfo.taskID,this.memory.taskInfo.taskPos)
        this.memory.taskInfo.taskType = undefined
        this.memory.taskInfo.taskID = undefined
        this.memory.taskInfo.taskPos = undefined
    },
    retTaskInfo(){
        const _taskType = this.memory.taskInfo.taskType
        const _taskID = this.memory.taskInfo.taskID
        const _taskPos = this.memory.taskInfo.taskPos
        const pos = task.searchTask(_taskType,this.memory.home,_taskID,_taskPos)
        return Game.spawns['Origin'].memory.task[_taskType][this.memory.home].taskList[pos]
    }
}