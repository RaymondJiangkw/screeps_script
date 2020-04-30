// Lab
// Change the memory
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
module.exports.loop = function() {
    profiler.wrap(function(){
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