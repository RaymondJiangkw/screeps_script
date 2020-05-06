const configObserver = require('configuration.Observer')
const configTower = require('configuration.Tower')
const configTerminal = require('configuration.Terminal')
const configSend = require('configuration.Send')
const configLab = require('configuration.Lab')
const configFactory = require('configuration.Factory')
const constants = require('constants')
const utils = require('utils')
const ADVANCED_BUCKET_LIMIT = 5000;
module.exports = function () {
    for (var roomName of global.rooms.my){
        if (Game.rooms[roomName].enemies.length > 0){
            var enemies = _.filter(Game.rooms[roomName].enemies,(e)=>utils.analyseCreep(e,false,true) !== "harmless");
            enemies = _.filter(enemies,(c)=>c.owner.username !== "Invader");
            if (enemies.length > 0) {
                for (var rampart of Game.rooms[roomName].ramparts) rampart.setPublic(false);
            }
        }
        if (Game.rooms[roomName].observer) {
            if (!global.observerCur) global.observerCur = {}
            if (!global.observerCur[roomName]) global.observerCur[roomName] = 0
            if (configObserver[roomName]){
                var length = configObserver[roomName].length
                if (length > 0){
                    if (global.observerCur[roomName] >= length) global.observerCur[roomName] = 0
                    Game.rooms[roomName].observer.observeRoom(configObserver[roomName][global.observerCur[roomName]]);
                    global.observerCur[roomName] = (global.observerCur[roomName] + 1) % length
                }
            }
        }
        if (global.links[roomName].resources.length > 0) {
            for (var link of global.links[roomName].resources) {
                if (link.store.getUsedCapacity(RESOURCE_ENERGY) === 0) continue
                var receivedLinks = [].concat(_.filter(global.links[roomName].upgrade,(link)=>link.store.getUsedCapacity(RESOURCE_ENERGY) === 0),
                _.filter(global.links[roomName].charges,(link)=>link.store.getUsedCapacity(RESOURCE_ENERGY) === 0))
                if (receivedLinks.length > 0) link.transferEnergy(receivedLinks[0])
            }
        }
        if (Game.rooms[roomName].towers.length > 0) {
            if (Game.rooms[roomName].enemies.length === 0){
                for (var tower of Game.rooms[roomName].towers) tower.run();
            }else{
                if (Game.rooms[roomName].enemies.length <= 2){
                    var enemies = _.shuffle(_.filter(Game.rooms[roomName].enemies,(e)=>utils.analyseCreep(e,false,true) !== "harmless"));
                    for (var i = 0; i < Game.rooms[roomName].towers.length; i++) Game.rooms[roomName].towers[i].attack(enemies[(i % enemies.length)])
                }else{
                    var roles = _.map(Game.rooms[roomName].enemies,(c)=>utils.analyseCreep(c,false,true));
                    if (roles.indexOf("attacker") >= 0){
                        var avgDistances = utils.getCreepsRange(Game.rooms[roomName].enemies)
                        var creepAnalysis = _.map(Game.rooms[roomName].enemies,(c)=>utils.analyseCreep(c,true,false))
                        var priority = []
                        for (var i = 0; i < Game.rooms[roomName].enemies.length;i++){
                            var creep = Game.rooms[roomName].enemies[i]
                            priority.push({
                                id:creep.id,
                                avgDistance:avgDistances[i],
                                role:creepAnalysis[i][0],
                                situation:creepAnalysis[i][1],
                                score:Math.floor((-1 * avgDistances[i] + configTower.defense.priorityRole[creepAnalysis[i][0]] + configTower.defense.prioritySituation[creepAnalysis[i][1]]) / 2)
                            })
                        }
                        priority.sort((infoA,infoB)=>{
                            var Ddis = infoA.avgDistance - infoB.avgDistance
                            var Drole = configTower.defense.priorityRole[infoA.role] - configTower.defense.priorityRole[infoB.role]
                            var DSituation = configTower.defense.prioritySituation[infoA.situation] - configTower.defense.prioritySituation[infoB.situation]
                            if (Math.abs(Ddis) >= 0.5) return Ddis
                            if (Drole !== 0) return Drole
                            if (DSituation !== 0) return DSituation
                        })
                        priority = _.uniq(priority,true,"score")
                        for (var i = 0; i < Game.rooms[roomName].towers.length; i++) Game.rooms[roomName].towers[i].attack(Game.getObjectById(priority[Math.floor(i + Math.random()) % priority.length].id))
                    }
                }
            }
        }
        if (Game.rooms[roomName].terminal && Game.cpu.bucket >= ADVANCED_BUCKET_LIMIT){
            if (Game.time % configTerminal.mostDesiredGoods.interval === 0){
                for (var desiredGoods in configTerminal.mostDesiredGoods){
                    if (desiredGoods === "interval") continue;
                    if (Game.rooms[roomName].terminal.cooldown !== 0) break;
                    if (Game.market.credits <= configTerminal.mostDesiredGoods[desiredGoods]["minCredits"]) continue
                    Game.rooms[roomName].terminal.dealOptimisticResources(ORDER_SELL,desiredGoods,undefined,{basePrice:configTerminal.mostDesiredGoods[desiredGoods]["maxPrice"],onlyDeal:true})
                }
            }
            if (Game.time % configTerminal.terminalCheckInterval === 0){
                if (configSend[roomName] && Game.time % configTerminal.terminalSendInterval === 0){
                    for (var sendInfo of configSend[roomName]){
                        if (Game.rooms[roomName].terminal.cooldown > 0) break
                        if (!Game.rooms[sendInfo.targetRoom].terminal) continue
                        if (Game.rooms[sendInfo.targetRoom].terminal.store.getUsedCapacity() >= sendInfo.targetStopCapacity) continue
                        if (Game.rooms[sendInfo.targetRoom].terminal.store[sendInfo.resourceType] >= sendInfo.targetStopAmount) continue
                        if (Game.rooms[roomName].terminal.store[sendInfo.resourceType] < sendInfo.baseAmount + sendInfo.sendAmount) continue
                        Game.rooms[roomName].terminal.send(sendInfo.resourceType,sendInfo.sendAmount,sendInfo.targetRoom,`Send the aid items ${sendInfo.resourceType} from ${roomName}`);
                    }
                }
                
                if (Game.rooms[roomName].terminal.distributeMineral() !== OK){
                    // Sell
                    if (configTerminal.sellingGoods[roomName]){
                        for (var goodsInfo of configTerminal.sellingGoods[roomName]){
                            if (Game.rooms[roomName].terminal.cooldown > 0) break
                            var resourceType = goodsInfo[0]
                            if (!global.resources[roomName][resourceType]) continue
                            var reservedAmount = goodsInfo[1]
                            var minSellAmount = goodsInfo[2]
                            if (global.resources[roomName][resourceType]["total"] <= reservedAmount) continue
                            if (Game.rooms[roomName].terminal.store[resourceType] <= minSellAmount) continue
                            var amount = Math.min(global.resources[roomName][resourceType]["total"] - reservedAmount,Game.rooms[roomName].terminal.store[resourceType])
                            Game.rooms[roomName].terminal.dealOptimisticResources(ORDER_BUY,resourceType,amount);
                        }
                    }
                    if (configTerminal.sellingMineral[roomName] && configTerminal.sellingMineral[roomName] > 0){
                        var thisMineralType = Game.rooms[roomName].mineral.mineralType
                        if (Game.rooms[roomName].terminal.cooldown === 0 && Game.rooms[roomName].terminal.store[thisMineralType] >= configTerminal.baseReservedMineral + configTerminal.sellingMineral[roomName]){
                            Game.rooms[roomName].terminal.dealOptimisticResources(ORDER_BUY,thisMineralType,configTerminal.sellingMineral[roomName],{onlyDeal:false});
                        }
                    }
                    if (configTerminal.sellingEnergy[roomName] && configTerminal.sellingEnergy[roomName] > 0){
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
                            if (resourceType !== RESOURCE_ENERGY) {
                                if (global.resources[roomName][resourceType] && global.resources[roomName][resourceType]["total"] > beginBuyingAmount) continue
                                var existingAmount = (global.resources[roomName][resourceType] && global.resources[roomName][resourceType]["total"]) || 0
                                Game.rooms[roomName].terminal.dealOptimisticResources(ORDER_SELL,resourceType,endBuyingAmount - existingAmount,{onlyDeal:false})
                            }else{
                                var existingAmount = Game.rooms[roomName].terminal.store["energy"]
                                if (existingAmount > beginBuyingAmount) continue;
                                Game.rooms[roomName].terminal.dealOptimisticResources(ORDER_SELL,RESOURCE_ENERGY,endBuyingAmount - existingAmount);
                            }
                        }
                    }
                }
            }
        }
        if (Game.rooms[roomName].labs.length > 0 && configLab[roomName] && Game.cpu.bucket >= ADVANCED_BUCKET_LIMIT){
            const mode = configLab[roomName]["mode"]
            if (mode !== "clear" && global.labStructures[roomName].core.length === 2){
                const resourceType = utils.getLabTarget(roomName,mode)
                const core1 = Game.getObjectById(global.labStructures[roomName].core[0]);
                const core2 = Game.getObjectById(global.labStructures[roomName].core[1]);
                if (mode === "focus" || mode === "default"){
                    if (core1.mineralType && core2.mineralType && REACTIONS[core1.mineralType][core2.mineralType] === resourceType) {
                        try{
                            for (var lab of global.labs[roomName][resourceType]) if (lab.cooldown === 0) lab.runReaction(core1,core2);
                        }catch (error) {};
                        try{
                            for (var lab of global.labs[roomName]["vacant"]) if (lab.cooldown === 0) lab.runReaction(core1,core2);
                        }catch (error) {};
                    }
                }else if (mode === "reverse"){
                    var fromlabs = global.labs[roomName][resourceType];
                    if (fromlabs){
                        for (var lab of fromlabs){
                            if (lab.cooldown > 0) continue;
                            lab.reverseReaction(core1,core2);
                        }
                    }
                }
            }
        }
        if (Game.rooms[roomName].factory && Game.rooms[roomName].factory.cooldown == 0 && configFactory[roomName] && Game.cpu.bucket >= ADVANCED_BUCKET_LIMIT) {
            for (var productionInfo of configFactory[roomName]){
                if (Game.rooms[roomName].factory.cooldown > 0) break;
                var production = productionInfo[0]
                var componentComplete = true
                for (var component in COMMODITIES[production].components){
                    if (Game.rooms[roomName].factory.store.getUsedCapacity(component) < COMMODITIES[production].components[component]){
                        componentComplete = false;
                        break;
                    }
                }
                if (!componentComplete) continue
                if (productionInfo[1] === "greedy" || !global.resources[roomName][production] || global.resources[roomName][production]["total"] < productionInfo[1]) Game.rooms[roomName].factory.produce(production);
            }
        }
        if (Game.rooms[roomName].powerSpawn) {
            const powerSpawn = Game.rooms[roomName].powerSpawn
            if (powerSpawn.store.getUsedCapacity(RESOURCE_ENERGY) >= 50 &&
                powerSpawn.store.getUsedCapacity(RESOURCE_POWER) >= 1) powerSpawn.processPower()
        }
    }
}