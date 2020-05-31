const prototype_room_structures = require('prototype.Room.structures')
const prototype_room_resources = require('prototype.Room.resources')
const prototype_room_creeps = require('prototype.Room.creeps')
const prototype_creep_travelTo = require('prototype.Creep.travelTo')
const prototype_room_task = require('prototype.Room.task')
const prototype_room_advancedTask = require('prototype.Room.advancedTask')
const prototype_spawn_task = require('prototype.Spawn.task')
const prototype_creep_task = require('prototype.Creep.task')
const prototype_creep_attack = require('prototype.Creep.attack')
const prototype_creep_defend = require('prototype.Creep.defend')
const prototype_creep_run = require('prototype.Creep.run')
const prototype_powerCreep_run = require('prototype.PowerCreep.run')
const prototype_terminal_run = require('prototype.Terminal.run')
const prototype_lab_run = require('prototype.Lab.run')
const prototype_tower_run = require('prototype.Tower.run')
module.exports = function () {
    if (!Memory.info) {
        const subList = ["roomState"]
        console.log("[Memory] Initializing Info.");
        Memory.info = {};
        subList.forEach(subInfo=>Memory.info[subInfo] = {});
    }
}