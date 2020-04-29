const configObserver = require('configuration.Observer')
const configTower = require('configuration.Tower')
const configTerminal = require('configuration.Terminal')
const configSend = require('configuration.Send')
const configLab = require('configuration.Lab')
const configFactory = require('configuration.Factory')
const utils = require('utils')
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
            if (Game.rooms[roomName].enemies.length === 0){
                for (var tower of Game.rooms[roomName].towers) {
                    tower.run()
                }
            }else{
                if (Game.rooms[roomName].enemies.length <= 2){
                    var enemies = _.shuffle(Game.rooms[roomName].enemies)
                    for (var i = 0; i < Game.rooms[roomName].towers.length; i++) tower.attack(enemies[(i % enemies.length)])
                }else{
                    var roles = _.map(Game.rooms[roomName].enemies,(c)=>utils.analyseCreep(c.id,false,true))
                    if (roles.indexOf("attacker") >= 0){
                        var avgDistances = utils.getCreepsRange(Game.rooms[roomName].enemies)
                        var creepAnalysis = _.map(Game.rooms[roomName].enemies,(c)=>utils.analyseCreep(c.id,true,false))
                        var priorityRole = {
                            harmless:3,
                            attacker:2,
                            healer:2,
                            advancedAttacker:1,
                            advancedArcher:1,
                            King:0,
                            advancedHealer:1,
                        }
                        var prioritySituation = {
                            "health":0,
                            "normal":2,
                            "damaged":3,
                            "weak":1,
                            "severe":4,
                        }
                        var priority = []
                        for (var i = 0; i < Game.rooms[roomName].enemies.length;i++){
                            var creep = Game.rooms[roomName].enemies[i]
                            priority.push({
                                id:creep.id,
                                avgDistance:avgDistances[i],
                                role:creepAnalysis[i][0],
                                situation:creepAnalysis[i][1],
                                score:Math.floor((-1 * avgDistances[i] + priorityRole[creepAnalysis[i][0]] + prioritySituation[creepAnalysis[i][1]]) / 2)
                            })
                        }
                        priority.sort((infoA,infoB)=>{
                            var Ddis = infoA.avgDistance - infoB.avgDistance
                            var Drole = priorityRole[infoA.role] - priorityRole[infoB.role]
                            var DSituation = prioritySituation[infoA.situation] - prioritySituation[infoB.situation]
                            if (Math.abs(Ddis) >= 0.5) return Ddis
                            if (Drole !== 0) return Drole
                            if (DSituation !== 0) return DSituation
                        })
                        priority = _.uniq(priority,true,"score")
                        for (var i = 0; i < Game.rooms[roomName].towers.length; i++) tower.attack(Game.getObjectById(priority[Math.floor(i + Math.random()) % priority.length].id))
                    }
                }
            }
        }
        if (Game.rooms[roomName].terminal && Game.time % configTerminal.terminalCheckInterval === 0){
//            if (Game.time % configTerminal.mostDesiredGoods.interval === 0){
                for (var desiredGoods in configTerminal.mostDesiredGoods){
                    if (Game.rooms[roomName].terminal.cooldown !== 0) break
                    if (Game.market.credits <= configTerminal[desiredGoods]["minCredits"]) continue
                    Game.rooms[roomName].terminal.dealOptimisticResources(ORDER_SELL,desiredGoods,undefined,{basePrice:configTerminal[desiredGoods]["maxPrice"]})
                }
//            }
            if (configSend[roomName]){
                for (var sendInfo of configSend[roomName]){
                    if (Game.rooms[roomName].terminal.cooldown > 0) break
                    if (!Game.rooms[sendInfo.targetRoom].terminal) continue
                    if (Game.rooms[sendInfo.targetRoom].terminal.store.getUsedCapacity() >= sendInfo.targetStopCapacity) continue
                    if (Game.rooms[sendInfo.targetRoom].terminal.store[sendInfo.resourceType] >= sendInfo.targetStopAmount) continue
                    if (Game.rooms[roomName].terminal.store[sendInfo.resourceType] < sendInfo.baseAmount + sendInfo.sendAmount) continue
                    Game.rooms[roomName].terminal.send(sendInfo.resourceType,sendInfo.sendAmount,sendInfo.targetRoom,`Send the aid items ${sendInfo.resourceType} from ${roomName}`);
                }
            }
            
            if (!global.terminalDistriTime) global.terminalDistriTime = {}
            if (!global.terminalDistriTime[roomName] || global.terminalDistriTime[roomName] <= Game.time){
                global.terminalDistriTime[roomName] = utils.getCacheExpiration()
                Game.rooms[roomName].terminal.distributeMineral()
            }else{
                // Sell
                if (configTerminal.sellingGoods[roomName]){
                    for (var goodsInfo of configTerminal.sellingGoods[roomName]){
                        if (Game.rooms[roomName].terminal.cooldown > 0) break
                        var resourceType = goodsInfo[0]
                        if (!global.resources[roomName][resourceType]) continue
                        var reservedAmount = goodsInfo[1]
                        var minSellAmount = goodsInfo[2]
                        if (global.resources[roomName][resourceType]["all"] <= reservedAmount) continue
                        if (Game.rooms[roomName].terminal.store[resourceType] <= minSellAmount) continue
                        var amount = Math.min(global.resources[roomName][resourceType]["all"] - reservedAmount,Game.rooms[roomName].terminal.store[resourceType])
                        Game.rooms[roomName].terminal.dealOptimisticResources(ORDER_BUY,resourceType,amount)
                    }
                }
                if (configTerminal.sellingMineral[roomName] && configTerminal.sellingMineral[roomName] > 0){
                    var thisMineralType = Game.rooms[roomName].mineral.mineralType
                    if (Game.rooms[roomName].terminal.cooldown === 0 && Game.rooms[roomName].terminal.store[thisMineralType] > configTerminal.sellingMineral[roomName]){
                        Game.rooms[roomName].terminal.dealOptimisticResources(ORDER_BUY,thisMineralType,configTerminal.sellingMineral[roomName],{onlyDeal:false});
                    }
                }
                if (configTerminal.sellingMineral[roomName] && configTerminal.sellingMineral[roomName] > 0){
                    if (Game.rooms[roomName].terminal.cooldown === 0 && Game.rooms[roomName].terminal.store[RESOURCE_ENERGY] >= configTerminal.baseReservedEnergy + configTerminal.sellingEnergy[roomName]){
                        Game.rooms[roomName].terminal.dealOptimisticResources(ORDER_BUY,RESOURCE_ENERGY,configTerminal.sellingEnergy[roomName],{onlyDeal:false})
                    }
                }
                // Buy
                if (configTerminal.buyingGoods[roomName]){
                    for (var goodsInfo of configTerminal.buyingGoods[roomName]){
                        if (Game.rooms[roomName].terminal.cooldown > 0) break
                        var resourceType = goodsInfo[0]
                        var beginBuyingAmount = goodsInfo[1]
                        var endBuyingAmount = goodsInfo[2]
                        if (global.resources[roomName][resourceType] && global.resources[roomName][resourceType]["all"] > beginBuyingAmount) continue
                        var existingAmount = 0
                        if (global.resources[roomName][resourceType]["all"]) existingAmount = global.resources[roomName][resourceType]["all"]
                        Game.rooms[roomName].terminal.dealOptimisticResources(ORDER_SELL,resourceType,endBuyingAmount - existingAmount,{onlyDeal:false})
                    }
                }
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