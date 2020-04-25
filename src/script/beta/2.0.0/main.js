const death = require('main.Death')
const mount = require('mount')
const init = require('prepare.init')
const task = require('main.task')
const structureRun = require('main.Structures')
const creepRun = require('main.Creeps')
const spawnRun = require('main.Spawns')
module.exports.loop = function() {
    death();
    mount();
    init();
    task.init();
    structureRun();
    creepRun();
    task.spawn();
    spawnRun();
}