const mountRoom = require('prototype.Room.structures')
const mountRoomCreep = require('prototype.Room.creeps')
const mountCreepTravel = require('prototype.Creep.travelTo')
const mountTask = require('prototype.Object.task')
const mountGroup = require('prototype.Creep.group')
module.exports = function() {
    mountTask()
    mountGroup()
}