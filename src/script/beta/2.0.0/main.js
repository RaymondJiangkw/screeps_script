const profiler = require('tool.profiler')
const marketCalculator = require('tool.marketCalculator')
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
const stateScanner = function () {
    if (Game.time % 20) return 
    if (!Memory.stats) Memory.stats = {}
    Memory.stats.gcl = (Game.gcl.progress / Game.gcl.progressTotal) * 100;
    Memory.stats.gclLevel = Game.gcl.level;
    Memory.stats.gpl = (Game.gpl.progress / Game.gpl.progressTotal) * 100;
    Memory.stats.gplLevel = Game.gpl.level;
    Memory.stats.cpu = Game.cpu.getUsed();
    Memory.stats.bucket = Game.cpu.bucket;
    Memory.stats.credits = Game.market.credits;
    if (!Memory.stats.controller) Memory.stats.controller = {}
    if (!Memory.stats.storage) Memory.stats.storage = {}
    if (!Memory.stats.terminal) Memory.stats.terminal = {}
    for (var roomName in Game.rooms){
        if (!Game.rooms[roomName].controller || !Game.rooms[roomName].controller.my) continue;
        Memory.stats.controller[roomName] = (Game.rooms[roomName].controller.progress / Game.rooms[roomName].controller.progressTotal) * 100;
        if (Game.rooms[roomName].storage) Memory.stats.storage[roomName] = {total:Game.rooms[roomName].storage.store.getUsedCapacity(),energy:Game.rooms[roomName].storage.store["energy"]};
        if (Game.rooms[roomName].terminal) Memory.stats.terminal[roomName] = Game.rooms[roomName].terminal.store.getUsedCapacity()
    }
}
const Wrap = function (func,_name) {
    const MAXIMUM_CPU_LIMIT = 50;
    if (Game.cpu.getUsed() < MAXIMUM_CPU_LIMIT) func();
    else {
        console.log("Prevent over-burst " + _name);
    }
}
module.exports.loop = function() {
    profiler.wrap(function(){
        // return;
        mount();
//      mountMarket.mount();
        death();
        console.log("before Init",Game.cpu.getUsed())
        init();
        console.log("after init",Game.cpu.getUsed())
        if (Game.time % 2 === 0) task.init();
        console.log("after task",Game.cpu.getUsed())
        structureRun();
        console.log("after structure",Game.cpu.getUsed())
        Wrap(powerCreepRun,"powerCreepRun");
        creepRun();
        console.log("after Creep",Game.cpu.getUsed())
        Wrap(task.spawn,"task.spawn");
        spawnRun();
        stateScanner();
    })
}