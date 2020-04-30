const taskHarvest = require('task.Harvest')
const taskTransfer = require('task.Transfer')
const taskPickup = require('task.Pickup')
const taskBuild = require('task.Build')
const taskRepair = require('task.Repair')
const taskTravel = require('task.Travel')
const taskDefend = require('task.Defend')
const taskAttack = require('task.Attack')
const taskSpawn = require('task.Spawn')
const utils = require('utils')
module.exports = {
    init:function(){
        if (!global.task) global.task = {}
        for (var roomName of global.rooms.my) {
            if (!Game.rooms[roomName].memory.taskExpiration || Game.rooms[roomName].memory.taskExpiration <= Game.time){
                Game.rooms[roomName].memory.taskExpiration = Game.time + utils.getCacheExpiration(1500)
                Game.rooms[roomName].refreshTask()
                Game.rooms[roomName].AddUpgradeTask()
            }
        }
        taskHarvest()
        taskBuild()
        taskRepair()
        taskPickup()
        taskTransfer()
        taskAttack()
        taskDefend()
        taskTravel()
    },
    spawn:function(){
        taskSpawn()
    }
}