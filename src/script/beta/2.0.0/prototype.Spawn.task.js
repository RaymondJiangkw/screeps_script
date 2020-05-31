const utils = require('utils')
const spawnConfig = require('configuration.Spawn')
const creepConfig = require('configuration.Creep')
const INFINITY = 32767
const countNum = function(_object){
    var ret = 0;
    for (var component in _object) ret += _object[component];
    return ret;
}
const spawnTaskExtension = {
    activateProtection(){
        this.memory.protection = Game.time + utils.getCacheExpiration(Math.ceil(spawnConfig.spawnIntervalTick * (1 + Math.random())))
    },
    isIdle(){
        if (this.memory.protection <= Game.time) this.memory.protection = 0
        if (!this.memory.taskFingerPrint && !this.spawning) return true
        return false
    },
    getTask(){
        const roomName = this.room.name
        var priority_limit = INFINITY
        if (this.memory.protection || Game.cpu.bucket < 1000) priority_limit = spawnConfig.protectionSpawnLevel
        this.memory.taskFingerPrint = Game.rooms[roomName].getTask(this,"spawn","all",false,priority_limit)
        if (this.memory.taskFingerPrint) return true
        return false
    },
    renewTask(){
        Game.rooms[this.room.name].renewTask(this.memory.taskFingerPrint)
        this.memory.taskFingerPrint = null
    },
    deleteTask(){
        Game.rooms[this.room.name].deleteTask(this.memory.taskFingerPrint);
        this.memory.taskFingerPrint = null
    },
    run(){
        if (this.spawning) return OK
        const taskInfo = this.room.taskInfo(this.memory.taskFingerPrint)
        const name = taskInfo.data.memory.role + "_" + this.room.name + "_" + Game.time
        const availableEnergy = this.room.energyAvailable
        var components = utils.getComponentsList(this.room.name,taskInfo.data.memory.role,taskInfo.data.memory.group.type,availableEnergy,creepConfig.components[taskInfo.data.memory.role])
        if ((taskInfo.data.memory.role === "attacker" || taskInfo.data.memory.role === "healer") && this.room.energyAvailable / this.room.energyCapacityAvailable < 0.8) return this.renewTask();
        if (taskInfo.data.memory.role === "defender_observed" && this.room.energyAvailable / this.room.energyCapacityAvailable < 0.4) return this.renewTask();
        var feedback = this.spawnCreep(components,name,{memory:taskInfo.data.memory})
        if (feedback === OK) {
            Game.rooms[this.room.name].finishTask(this.memory.taskFingerPrint)
            this.memory.taskFingerPrint = null
        }else if (feedback === ERR_INVALID_ARGS) this.deleteTask();
        else this.renewTask()
    }
}
_.assign(Spawn.prototype,spawnTaskExtension)