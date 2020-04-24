const mountModule = require('mount')
const initModule = require("init.general")
const assessModule = require("assess.general")
const task = require("task.general")
const taskSend = require("task.send")
const roleSpawn = require('role.spawn')
const roleLink = require('role.link')
const roleJob = require('role.job')
const roleLab = require('role.lab')
const roleFactory = require('role.factory')
const roleNuker = require('role.nuker')
const stateScanner = function () {
    if (Game.time % 20) return 
    if (!Memory.stats) Memory.stats = {}
    Memory.stats.gcl = (Game.gcl.progress / Game.gcl.progressTotal) * 100
    Memory.stats.gclLevel = Game.gcl.level
    Memory.stats.gpl = (Game.gpl.progress / Game.gpl.progressTotal) * 100
    Memory.stats.gplLevel = Game.gpl.level
    Memory.stats.cpu = Game.cpu.getUsed()
    Memory.stats.bucket = Game.cpu.bucket
}
module.exports.loop = function () {
    console.log("")
    mountModule()
    console.log("==========","New Loop",Game.time,"==========")
    // Prepare the information
    initModule.init()
    Game.spawns['Origin'].memory.init = {}
    Game.spawns['Origin'].memory.init.access = initModule.access
    Game.spawns['Origin'].memory.init.groupedContainers = initModule.groupedContainers
    Game.spawns['Origin'].memory.init.groupedLinks = initModule.groupedLinks
    Game.spawns['Origin'].memory.init.groupedLabs = initModule.groupedLabs
    Game.spawns['Origin'].memory.init.infoResources = initModule.infoResources
    Game.spawns['Origin'].memory.init.infoCompounds = initModule.infoCompounds
    Game.spawns['Origin'].memory.init.infoMarket = initModule.infoMarket
    Game.spawns['Origin'].memory.init.infoRooms = initModule.infoRooms
    Game.spawns['Origin'].memory.init.resourceCached = initModule.resourceCached
    console.log("!!! Prepare the information finished with the cpu:",Game.cpu.getUsed())
    // Init Memory
    if (Game.spawns['Origin'].memory.hasOwnProperty("resourceOccupied") === false) {
        Game.spawns['Origin'].memory["resourceOccupied"] = {}
    }
    if (Game.spawns['Origin'].memory.hasOwnProperty("mineralOccupied") === false) {
        Game.spawns['Origin'].memory['mineralOccupied'] = {}
    }
    if (Game.spawns['Origin'].memory.hasOwnProperty("task") === false){
        Game.spawns['Origin'].memory['task'] = {}
    }
    if (Game.spawns['Origin'].memory.task.hasOwnProperty("transfer") === false){
        Game.spawns['Origin'].memory['task']['transfer'] = {terminal:{},powerSpawn:{},lab:{},factory:{},nuker:{},storage:{},container:{}}
    }
    // Assess the situation
    assessModule.init()
    Game.spawns['Origin'].memory.assess = {}
    Game.spawns['Origin'].memory.assess.access = assessModule.access
    console.log("!!! Assess the situation finished with the cpu:",Game.cpu.getUsed())
    // Clear Memory
    for (var name in Memory.creeps) {
        if (!Game.creeps[name]) {
            // Reset the state
            const _creepRole = Memory.creeps[name].role
            if (_creepRole === 'transferer' && Memory.creeps[name].resourceId !== undefined){
                Game.spawns['Origin'].memory["resourceOccupied"][Memory.creeps[name].home][Memory.creeps[name].resourceId] = false
            }else if (_creepRole === 'miner' && Memory.creeps[name].mineralId !== undefined){
                Game.spawns['Origin'].memory["mineralOccupied"][Memory.creeps[name].home][Memory.creeps[name].mineralId] = false
            }else if (_creepRole === 'pickuper' && Memory.creeps[name].taskTransfer && Memory.creeps[name].taskTransfer.task){
                if (Memory.creeps[name].taskTransfer.task[2] === 0){
                    task.finishTransferTask(Memory.creeps[name].home,Memory.creeps[name].taskTransfer.task[0],Memory.creeps[name].taskTransfer.task[1])
                }else if (Memory.creeps[name].taskTransfer.task[2] > 0){
                    task.renewTransfer(Memory.creeps[name].home,Memory.creeps[name].taskTransfer.task[0],Memory.creeps[name].taskTransfer.task[1],Memory.creeps[name].taskTransfer.task[2])
                }
            }
            if (Memory.creeps[name].taskInfo && Memory.creeps[name].taskInfo.taskID){
                task.renewTask(Memory.creeps[name].taskInfo.taskType,Memory.creeps[name].home,Memory.creeps[name].taskInfo.taskID,Memory.creeps[name].taskInfo.taskPos)
            }
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
        }
    }
    taskSend()
    let controlledRooms = Game.spawns['Origin'].memory.init.infoRooms.controlled
    for (let i = 0; i < controlledRooms.length;i++){
        const roomName = controlledRooms[i]
        // Spawn
        for (let j = 0; j < Game.spawns['Origin'].memory.init.access.spawns[roomName].length;j++){
            roleSpawn.run(Game.getObjectById(Game.spawns['Origin'].memory.init.access.spawns[roomName][j]))
        }
        // Link
        // Link can not transfer minerals now
        for (let j = 0; j < Game.spawns['Origin'].memory.init.groupedLinks.emitFrom[roomName]["resources"].length;j++){
            roleLink.run(Game.getObjectById(Game.spawns['Origin'].memory.init.groupedLinks.emitFrom[roomName]["resources"][j]),roomName)
        }
        console.log("   ===",roomName," Creeps & Towers Running log===")
        // Tower
        for (let j = 0; j < Game.spawns['Origin'].memory.init.access.towers[roomName].length;j++){
            roleJob.run(Game.getObjectById(Game.spawns['Origin'].memory.init.access.towers[roomName][j]),"tower")
        }
        // Creep
        for (let j = 0; j < Game.spawns['Origin'].memory.init.access.creeps[roomName].length;j++){
            roleJob.run(Game.getObjectById(Game.spawns['Origin'].memory.init.access.creeps[roomName][j]))
        }
        console.log("!!! Dealing with the room",roomName,"finished with the cpu:",Game.cpu.getUsed())
        // Lab
        // Gather Info requires condition
        // But since labs produce minerals do not require energy, we should make use of them fully
        if (Game.spawns['Origin'].memory.assess.access.is.labs[roomName] === true) {
            roleLab.run(roomName)
        }
        // Factory
        if (Game.spawns['Origin'].memory.assess.access.is.factories[roomName] === true){
            roleFactory.run(roomName)
        }
        // Nuker
        if (Game.spawns['Origin'].memory.assess.access.is.nukers[roomName] === true){
            roleNuker.run(roomName)
        }
    }
    stateScanner()
}

