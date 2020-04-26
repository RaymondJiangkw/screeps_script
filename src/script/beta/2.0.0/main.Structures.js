const configObserver = require('configuration.Observer')
const configTower = require('configuration.Tower')
const configLab = require('configuration.Lab')
const configFactory = require('configuration.Factory')
module.exports = function () {
    for (var roomName of global.rooms.my){
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
                if (link.store.getUsedCapacity(RESOURCE_ENERGY) === 0) continue
                var receivedLinks = [].concat(_.filter(global.links[roomName].upgrade,(link)=>link.store.getUsedCapacity(RESOURCE_ENERGY) === 0),
                _.filter(global.links[roomName].charges,(link)=>link.store.getUsedCapacity(RESOURCE_ENERGY) === 0))
                if (link.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && receivedLinks.length > 0){
                    link.transferEnergy(receivedLinks[0])
                }
            }
        }
        if (Game.rooms[roomName].towers !== []) {
            for (var tower of Game.rooms[roomName].towers) {
                tower.run()
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
                for (var productionInfo of configFactory[roomName]){
                    var production = productionInfo[0]
                    var componentComplete = true
                    for (var component in COMMODITIES[production].components){
                        if (Game.rooms[roomName].factory.store.getUsedCapacity(component) < COMMODITIES[production].components[component]){
                            componentComplete = false
                            break
                        }
                    }
                    if (!componentComplete) continue
                    if (productionInfo[1] === "greedy" || Game.rooms[roomName].factory.store.getUsedCapacity(production) < productionInfo[1]) Game.rooms[roomName].factory.produce(production)
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
}