const taskHarvest = require('task.Harvest')
const taskTransfer = require('task.Transfer')
const taskPickup = require('task.Pickup')
const taskBuild = require('task.Build')
const taskRepair = require('task.Repair')
const taskDefend = require('task.Defend')
const taskAttack = require('task.Attack')
const taskSpawn = require('task.Spawn')
module.exports = function(){
    if (!global.task) global.task = {}
    taskHarvest()
    taskBuild()
    taskRepair()
    taskTransfer()
    taskPickup()
}