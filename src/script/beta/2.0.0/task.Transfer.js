const utils = require('utils')
const factoryConfig = require('configuration.Factory')
const towerConfig = require('configuration.Tower')
const terminalConfig = require('configuration.Terminal')
const labConfig = require('configuration.Lab')
const powerSpawnConfig = require('configuration.PowerSpawn')
const Constants = require('constants')
const needEnergy = function(object){
    return object.store.getFreeCapacity(RESOURCE_ENERGY) > 0
}
module.exports = function() {
    if (!global.task.transfer) global.task.transfer = {}
    for (var roomName of global.rooms.my){
        // Basic Transfer
        var spawns = _.filter(Game.rooms[roomName].spawns,needEnergy)
        var extensions = _.filter(Game.rooms[roomName].extensions,needEnergy)
        var towers = _.filter(Game.rooms[roomName].towers,(t)=>t.store.getUsedCapacity(RESOURCE_ENERGY) <= towerConfig.reservedEnergy)
        if (spawns.length > 0) Game.rooms[roomName].AddTransferTask("core","energy","spawns",RESOURCE_ENERGY);
        if (extensions.length > 0) Game.rooms[roomName].AddTransferTask("core","energy","extensions",RESOURCE_ENERGY,);
        if (towers.length > 0) Game.rooms[roomName].AddTransferTask("defense","energy","towers",RESOURCE_ENERGY);
        if (Game.rooms[roomName].powerSpawn && Game.rooms[roomName].powerSpawn.store.getUsedCapacity(RESOURCE_ENERGY) <= powerSpawnConfig.startChargeEnergy) {
            Game.rooms[roomName].AddTransferTask("advanced","energy",Game.rooms[roomName].powerSpawn.id,RESOURCE_ENERGY);
        }
        
        if (!global.task.transfer[roomName]) global.task.transfer[roomName] = {}
        if (!global.task.transfer[roomName].cachedExpirationTime || global.task.transfer[roomName].cachedExpirationTime <= Game.time){
            global.task.transfer[roomName].cachedExpirationTime = utils.getCacheExpiration(15) + Game.time
            var labs = _.filter(Game.rooms[roomName].labs,needEnergy)
            if (labs.length > 0) Game.rooms[roomName].AddTransferTask("advanced","energy","labs",RESOURCE_ENERGY);

            if (Game.rooms[roomName].factory && Game.rooms[roomName].factory.store.getUsedCapacity(RESOURCE_ENERGY) <= factoryConfig.reservedEnergy) Game.rooms[roomName].AddTransferTask("advanced","energy",Game.rooms[roomName].factory.id,RESOURCE_ENERGY)
            
            if (Game.rooms[roomName].terminal){
                var terminalEnergy = terminalConfig.baseReservedEnergy
                if (terminalConfig["sellingEnergy"][roomName]) terminalEnergy += terminalConfig["sellingEnergy"][roomName]
                if (Game.rooms[roomName].terminal.store.getUsedCapacity(RESOURCE_ENERGY) <= terminalEnergy) Game.rooms[roomName].AddTransferTask("advanced","energy",Game.rooms[roomName].terminal.id,RESOURCE_ENERGY)
            }
            
            // Charge Nuker
            if (Game.rooms[roomName].nuker && Game.rooms[roomName].nuker.store.getFreeCapacity(RESOURCE_GHODIUM) > 0 && global.resources[roomName][RESOURCE_GHODIUM]){
                if (global.resources[roomName][RESOURCE_GHODIUM]["labs"]){
                    Game.rooms[roomName].AddTransferTask("defense","lab",Game.rooms[roomName].nuker.id,RESOURCE_GHODIUM,"full")
                }else if (global.resources[roomName][RESOURCE_GHODIUM]["terminal"]){
                    Game.rooms[roomName].AddTransferTask("defense",Game.rooms[roomName].terminal.id,Game.rooms[roomName].nuker.id,RESOURCE_GHODIUM,"full")
                }else if (global.resources[roomName][RESOURCE_GHODIUM]["storage"]){
                    Game.rooms[roomName].AddTransferTask("defense",Game.rooms[roomName].storage.id,Game.rooms[roomName].nuker.id,RESOURCE_GHODIUM,"full")
                }else if (global.resources[roomName][RESOURCE_GHODIUM]["factory"]){
                    Game.rooms[roomName].AddTransferTask("defense",Game.rooms[roomName].factory.id,Game.rooms[roomName].nuker.id,RESOURCE_GHODIUM,"full")
                }
            }

            // Charge Power
            if (global.resources[roomName][RESOURCE_POWER] && Game.rooms[roomName].powerSpawn && Game.rooms[roomName].powerSpawn.store.getFreeCapacity(RESOURCE_POWER) > 0){
                if (global.resources[roomName][RESOURCE_POWER]["storage"]){
                    Game.rooms[roomName].AddTransferTask("advanced",Game.rooms[roomName].storage.id,Game.rooms[roomName].powerSpawn.id,RESOURCE_POWER,"full")
                }else if (global.resources[roomName][RESOURCE_POWER]["terminal"]){
                    Game.rooms[roomName].AddTransferTask("advanced",Game.rooms[roomName].terminal.id,Game.rooms[roomName].powerSpawn.id,RESOURCE_POWER,"full")
                }
            }

            // Transfer Lab
            if (Game.rooms[roomName].labs !== []){
                if (labConfig[roomName]){
                    const mode = labConfig[roomName]["mode"]
                    if (mode === "focus" && global.labStructures[roomName].core.length >= 2){
                        const resourceType = labConfig[roomName]["focus"]
                        if (resourceType){
                            const _components = Constants.labFormula[resourceType]
                            var coreLabs = []
                            const coreLabA = {"id":global.labStructures[roomName].core[0],"mineralType":Game.getObjectById(global.labStructures[roomName].core[0]).mineralType}
                            const coreLabB = {"id":global.labStructures[roomName].core[1],"mineralType":Game.getObjectById(global.labStructures[roomName].core[1]).mineralType}
                            if (coreLabA.mineralType == _components[0] || coreLabB.mineralType == _components[1]) coreLabs.push(coreLabA,coreLabB)
                            else coreLabs.push(coreLabB,coreLabA)

                            for (var i = 0; i < coreLabs.length;i++){
                                var coreLab = coreLabs[i]
                                if (!coreLab.mineralType || coreLab.mineralType == _components[i]){
                                    if (global.resources[roomName][_components[i]]) Game.rooms[roomName].AddTransferTask("advanced","resource",coreLab.id,_components[i],"full");
                                }else{
                                    if (Game.rooms[roomName].storage) Game.rooms[roomName].AddTransferTask("advanced",coreLab.id,Game.rooms[roomName].storage,coreLab.mineralType,"exhaust");
                                }
                            }

                            const groups = ["XGroup","YGroup"]
                            if (Game.rooms[roomName].storage){
                                for (var group of global.labStructures[roomName][groups]){
                                for (var _lab of global.labStructures[roomName][groups][group]){
                                    var lab = Game.getObjectById(_lab)
                                    if (lab.mineralType !== resourceType || lab.store.getFreeCapacity(mineralType) <= 300) Game.rooms[roomName].AddTransferTask("advanced",_lab,Game.rooms[roomName].storage.id,lab.mineralType,"exhaust")
                                }
                                }
                            }
                        }
                    }else if (mode === "clear" && Game.rooms[roomName].storage){
                        for (var lab of Game.rooms[roomName].labs) if (lab.mineralType) Game.rooms[roomName].AddTransferTask("advanced",lab.id,Game.rooms[roomName].storage.id,lab.mineralType,"exhaust")
                    }
                }
            }

            // Sell Commodities
            if (terminalConfig.sellingGoods[roomName] && Game.rooms[roomName].terminal){
                for (var info of terminalConfig.sellingGoods[roomName]){
                    const resourceType = info[0]
                    const reservedAmount = info[1]
                    if (!global.resources[roomName][resourceType]) continue
                    if (global.resources[roomName][resourceType]["total"] <= reservedAmount) continue

                    const sellingAmount = global.resources[roomName][resourceType]["total"] - reservedAmount
                    var checkOrders = ["factory","labs","storage"]
                    for (var retrievedStructure of checkOrders){
                        if (!global.resources[roomName][resourceType][retrievedStructure]) continue
                        var amount = Math.min(sellingAmount,global.resources[roomName][resourceType][retrievedStructure])
                        var fromTarget = Game.rooms[roomName][retrievedStructure].id
                        if (!fromTarget) fromTarget = retrievedStructure
                        if (Game.rooms[roomName].AddTransferTask("advanced",fromTarget,Game.rooms[roomName].terminal.id,resourceType,amount)) sellingAmount -= amount;
                    }
                }
            }
        }

        if (Game.rooms[roomName].storage && (!global.task.transfer[roomName]["tombExpirationTime"] || global.task.transfer[roomName]["tombExpirationTime"] <= Game.time)){
            global.task.transfer[roomName]["tombExpirationTime"] = Game.time + utils.getCacheExpiration()
            var tombStones = Game.rooms[roomName].find(FIND_TOMBSTONES)
            tombStones.sort((a,b)=>b.store.getUsedCapacity() - a.store.getUsedCapacity())
            for (var tombStone of tombStones) Game.rooms[roomName].AddTransferTask("advanced",tombStone.id,Game.rooms[roomName].storage.id,"exhaust")
        }
    }
    for (var roomName of global.rooms.observed){
        if (Game.rooms[roomName].controller && Game.rooms[roomName].owner) continue
        const home = utils.getClosetSuitableRoom(roomName,7)
        for (var container of Game.rooms[roomName].containers){
            if (container.store.getUsedCapacity() >= 1000){
                Game.rooms[home].AddTransferTask("advanced",container.id,Game.rooms[home].storage.id,"exhaust",fromRoom = roomName)
            }
        }
    }
}