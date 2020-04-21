const mount = require('mount')
const init = require('prepare.init')
const task = require('main.task')
const structureRun = require('main.Structures')
const creepRun = require('main.Creeps')
const spawnRun = require('main.Spawns')
module.exports.loop = function() {
    for (var name in Memory.creeps) {
        if (!Game.creeps[name]) {
            console.log(Game.time)
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
        }
    }
    mount();
    init();
    task();
    spawnRun();
    structureRun();
    creepRun();
}