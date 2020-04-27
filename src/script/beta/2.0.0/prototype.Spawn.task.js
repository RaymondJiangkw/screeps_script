const utils = require('utils')
const spawnConfig = require('configuration.Spawn')
const INFINITY = 32767
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
        if (this.memory.protection) priority_limit = spawnConfig.protectionSpawnLevel
        this.memory.taskFingerPrint = Game.rooms[roomName].getTask(this,"spawn","all",false,priority_limit)
        if (this.memory.taskFingerPrint) return true
        return false
    },
    run(){
        if (this.spawning) return OK
        const roomName = this.room.name
        const taskInfo = Game.rooms[roomName].taskInfo(this.memory.taskFingerPrint)
        const name = taskInfo.data.memory.role + "_" + this.room.name + "_" + Game.time
        const availableEnergy = Game.rooms[roomName].energyAvailable
        var components = utils.getComponentsList(this.room.name,taskInfo.data.memory.role,taskInfo.data.memory.group.type,availableEnergy,taskInfo.data.components)
        var feedback = this.spawnCreep(components,name,{memory:taskInfo.data.memory})
        if (feedback === OK) {
            Game.rooms[this.room.name].finishTask(this.memory.taskFingerPrint)
            this.memory.taskFingerPrint = null
        }
    }
}
_.assign(Spawn.prototype,spawnTaskExtension)