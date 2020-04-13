const prototype_room_structures = require('prototype.Room.structures')
const prototype_room_resources = require('prototype.Room.resources')
const prototype_room_creeps = require('prototype.Room.creeps')
const prototype_creep_travelTo = require('prototype.Creep.travelTo')
const prototype_room_task = require('prototype.Room.task')
const prototype_creep_task = require('prototype.Creep.task')
module.exports = function(){
    if (!global.hasExtensions) {
        global.hasExtensions = true
        prototype_creep_task()
        prototype_room_task()
        console.log("[mount] Remount Successful!")
    }
}