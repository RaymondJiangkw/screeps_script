const profiler = require('tool.profiler')
const death = require('main.Death')
const mount = require('mount')
const mountMarket = require('prototype.Market.run')
const init = require('prepare.init')
const task = require('main.task')
const structureRun = require('main.Structures')
const creepRun = require('main.Creeps')
const powerCreepRun = require('main.PowerCreeps')
const spawnRun = require('main.Spawns')
profiler.enable();
const _1switch2 = function() {
    const getSpawnCnt = function(roomName,groupType){
        if (!Game.rooms[roomName].memory.spawnCnt) Game.rooms[roomName].memory.spawnCnt = {}
        if (!Game.rooms[roomName].memory.spawnCnt[groupType]) Game.rooms[roomName].memory.spawnCnt[groupType] = 0
        Game.rooms[roomName].memory.spawnCnt[groupType]++;
        return {type:groupType,name:groupType + "_" + roomName + "_" + Game.rooms[roomName].memory.spawnCnt[groupType]};
    }
    for (var name in Game.creeps){
        var creep = Game.creeps[name]
        if (!creep.memory.group){
            creep.memory.boostCompounds = []
            if (creep.memory.role === "pickuper") creep.memory.role = "transferer";
            else if (creep.memory.role === "transferer") creep.memory.role = "harvester";
            else if (creep.memory.role === "builder") creep.memory.role = "worker";
            else if (creep.memory.role === "harvester") creep.memory.role = "transferer";
            else if (creep.memory.role === "traveler") creep.memory.role = "transferer";
            else if (creep.memory.role === "miner") creep.memory.role = "harvester";
            if (creep.memory.role === "transferer") creep.memory.group = getSpawnCnt(creep.memory.home,"pureTransfer");
            else if (creep.memory.role === "harvester") creep.memory.group = getSpawnCnt(creep.memory.home,"localHarvest");
            else if (creep.memory.role === "upgrader") creep.memory.group = getSpawnCnt(creep.memory.home,"pureUpgrader");
            else if (creep.memory.role === "worker") creep.memory.group = getSpawnCnt(creep.memory.home,"pureWorker");
            else if (creep.memory.role === "repairer") creep.memory.group = getSpawnCnt(creep.memory.home,"pureRepairer");
            creep.memory.salt = 0;
        }
    }
}
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
module.exports.loop = function() {
    profiler.wrap(function(){
        _1switch2();
        stateScanner();
        mount();
//      mountMarket.mount();
        death();
        init();
        task.init();
        structureRun();
        powerCreepRun();
        creepRun();
        task.spawn();
        spawnRun();
    })
}