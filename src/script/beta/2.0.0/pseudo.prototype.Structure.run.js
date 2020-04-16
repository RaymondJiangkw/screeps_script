const configObserver = require('configuration.Observer')
const configTower = require('configuration.Tower')
const configLab = require('configuration.Lab')
const configFactory = require('configuration.Factory')
module.exports = function (roomName) {
    if (Game.rooms[roomName].observer) {
        if (!global.observerCur) global.observerCur = {}
        if (!global.observerCur[roomName]) global.observerCur[roomName] = 0
        if (configObserver[roomName]){
            var length = configObserver[roomName].length
            if (length > 0){
                if (global.observerCur[roomName] >= length) global.observerCur[roomName] = 0
                Game.rooms[roomName].observer.observeRoom(configObserver[roomName][global.observerCur[roomName]])
                global.observerCur[roomName] = (global.observerCur[roomName] + 1) % length
            }
        }
    }
    if (global.links[roomName] && global.links[roomName].resources) {
        for (var link of global.links[roomName].resources) {
            var receivedLinks = [].concat(_.filter(global.links[roomName].upgrade,(link)=>link.store.getUsedCapacity(RESOURCE_ENERGY) === 0),
            _.filter(global.links[roomName].charges,(link)=>link.store.getUsedCapacity(RESOURCE_ENERGY) === 0))
            if (link.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && receivedLinks.length > 0){
                link.transferEnergy(receivedLinks[0])
            }
        }
    }
    if (Game.rooms[roomName].towers !== []) {
        for (var tower of Game.rooms[roomName].towers) {
            // Repair Part
            if (tower.store.getUsedCapacity(RESOURCE_ENERGY) >= configTower.reservedEnergy) {
                var towerRepairs = global.towerRepairs[roomName]
                if (towerRepairs.common.length > 0) tower.repair(towerRepairs.common[0])
                else if (towerRepairs.ramparts.length > 0) tower.repair(towerRepairs.ramparts[0])
                else if (towerRepairs.walls.length > 0) tower.repair(towerRepairs.walls[0])
            }
            // Defend Part
            // Shallow Version
            if (Game.rooms[roomName].enemies.length > 0) tower.attack(Game.rooms[roomName].enemies[0])
        }
    }
    if (Game.rooms[roomName].labs !== []){
        if (configLab[roomName]){
            const mode = configLab[roomName]["mode"]
            if (mode === "focus" && configLab[roomName]["focus"]){
                const resourceType = configLab[roomName]["focus"]
                const core1 = global.labStructures[roomName].core[0]
                const core2 = global.labStructures[roomName].core[1]
                if (core1 && core2 && core1.mineralType && core2.mineralType && REACTIONS[core1.mineralType][core2.mineralType] === resourceType){
                    for (var lab of Game.rooms[roomName].labs){
                        if (lab === core1 || lab === core2) continue
                        lab.runReaction(core1,core2)
                    }
                }
            }
        }
    }
    if (Game.rooms[roomName].factory && Game.rooms[roomName].factory.cooldown == 0) {
        if (configFactory[roomName]){
            for (var production of configFactory[roomName]){
                var componentComplete = true
                for (var component in COMMODITIES[production].components){
                    if (Game.rooms[roomName].factory.store.getUsedCapacity(component) >= COMMODITIES[production].components[component]){
                        componentComplete = false
                        break
                    }
                }
                if (!componentComplete) continue
                Game.rooms[roomName].factory.produce(production)
                break
            }
        }
    }
    if (Game.rooms[roomName].powerSpawn) {
        const powerSpawn = Game.rooms[roomName].powerSpawn
        if (powerSpawn.store.getUsedCapacity(RESOURCE_ENERGY) >= 50 &&
            powerSpawn.store.getUsedCapacity(RESOURCE_POWER) >= 1) powerSpawn.processPower()
    }
}