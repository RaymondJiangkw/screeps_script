const prototype_room_structures = require('prototype.Room.structures')
const prototype_room_resources = require('prototype.Room.resources')
const prototype_room_creeps = require('prototype.Room.creeps')
const prototype_creep_travelTo = require('prototype.Creep.travelTo')
const prototype_lab_run = require('prototype.Lab.run')
const prototype_market_run = require('prototype.Market.run')
const prototype_room_task = require('prototype.Room.task')
const prototype_spawn_task = require('prototype.Spawn.task')
const prototype_creep_task = require('prototype.Creep.task')
const prototype_creep_run = require('prototype.Creep.run')
const prototype_powerCreep_run = require('prototype.PowerCreep.run')
module.exports = function(){
    if (!global.hasExtensions) {
        global.hasExtensions = true
        prototype_lab_run()
        prototype_market_run()
        prototype_room_task()
        prototype_spawn_task()
        prototype_creep_task()
        prototype_creep_run()
        prototype_powerCreep_run()
        console.log("[mount] Remount Successful!")
    }
}