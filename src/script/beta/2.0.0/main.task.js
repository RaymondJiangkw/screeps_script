const taskHarvest = require('task.Harvest')
const taskTransfer = require('task.Transfer')
const taskPickup = require('task.Pickup')
const taskBuild = require('task.Build')
const taskRepair = require('task.Repair')
const taskTravel = require('task.Travel')
const taskDefend = require('task.Defend')
const taskAttack = require('task.Attack')
const taskSpawn = require('task.Spawn')
module.exports = function(){
    if (!global.task) global.task = {}
    if (!global.task.upgrade){
        global.task.upgrade = true
        for (var roomName of global.rooms.my){
            Game.rooms[roomName].AddUpgradeTask()
        }
    }
    taskHarvest()
    taskBuild()
    taskRepair()
    taskTransfer()
    taskPickup()
    taskAttack()
    taskTravel()
    taskSpawn()
}