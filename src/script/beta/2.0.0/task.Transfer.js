const utils = require('utils')
const factoryConfig = require('configuration.Factory')
const towerConfig = require('configuration.Tower')
const terminalConfig = require('configuration.Terminal')
const labConfig = require('configuration.Lab')
const Constants = require('constants')
const needEnergy = function(object){
    return object.store.getFreeCapacity(RESOURCE_ENERGY) > 0
}
module.exports = function() {
    if (!global.task.transfer) global.task.transfer = {}
    for (var roomName of global.rooms.my){
        if (!global.task.transfer[roomName]) global.task.transfer[roomName] = {}
        if (!global.task.transfer[roomName].cachedExpirationTime || global.task.transfer[roomName].cachedExpirationTime <= Game.time){
            global.task.transfer[roomName].cachedExpirationTime = utils.getCacheExpiration(15) + Game.time
            // Charge Energy
            var spawns = _.filter(Game.rooms[roomName].spawns,needEnergy)
            var extensions = _.filter(Game.rooms[roomName].extensions,needEnergy)
            var towers = _.filter(Game.rooms[roomName].towers,(t)=>t.store.getUsedCapacity(RESOURCE_ENERGY) <= towerConfig.reservedEnergy)
            var powerSpawn = _.filter(Game.rooms[roomName].powerSpawn,needEnergy)
            var labs = _.filter(Game.rooms[roomName].labs,needEnergy)
            var nuker = _.filter(Game.rooms[roomName].nuker,needEnergy)
            var factory = _.filter(Game.rooms[roomName].factory,(f)=>f.store.getUsedCapacity(RESOURCE_ENERGY) <= factoryConfig.reservedEnergy)
            var terminalEnergy = terminalConfig.baseReservedEnergy
            if (terminalConfig["sellingEnergy"][roomName]) terminalEnergy += terminalConfig["sellingEnergy"][roomName]
            var terminal = _.filter(Game.rooms[roomName].terminal,(t)=>t.store.getUsedCapacity(RESOURCE_ENERGY) <= terminalEnergy)
            var core = [].concat(spawns,extensions)
            var defense = [].concat(towers,nuker)
            var advanced = [].concat(powerSpawn,labs,factory,terminal)
            for (var structure of core){
                Game.rooms[roomName].AddTransferTask("core","energy",structure.id,RESOURCE_ENERGY,structure.store.getFreeCapacity(RESOURCE_ENERGY))
            }
            for (var structure of defense){
                Game.rooms[roomName].AddTransferTask("defense","energy",structure.id,RESOURCE_ENERGY,structure.store.getFreeCapacity(RESOURCE_ENERGY))
            }
            for (var structure of advanced){
                Game.rooms[roomName].AddTransferTask("advanced","energy",structure.id,RESOURCE_ENERGY,structure.store.getFreeCapacity(RESOURCE_ENERGY))
            }
            // Charge Nuker
            if (Game.rooms[roomName].nuker && Game.rooms[roomName].nuker.store.getFreeCapacity(RESOURCE_GHODIUM) > 0 && global.resources[roomName][RESOURCE_GHODIUM]){
                if (global.resources[roomName][RESOURCE_GHODIUM]["labs"]){
                    Game.rooms[roomName].AddTransferTask("defense","lab",Game.rooms[roomName].nuker.id,RESOURCE_GHODIUM,Math.min(Game.rooms[roomName].nuker.store.getFreeCapacity(RESOURCE_GHODIUM),global.resources[roomName][RESOURCE_GHODIUM]["labs"]))
                }else if (global.resources[roomName][RESOURCE_GHODIUM]["terminal"]){
                    Game.rooms[roomName].AddTransferTask("defense",Game.rooms[roomName].terminal.id,Game.rooms[roomName].nuker.id,RESOURCE_GHODIUM,Math.min(Game.rooms[roomName].nuker.store.getFreeCapacity(RESOURCE_GHODIUM),global.resources[roomName][RESOURCE_GHODIUM]["terminal"]))
                }else if (global.resources[roomName][RESOURCE_GHODIUM]["storage"]){
                    Game.rooms[roomName].AddTransferTask("defense",Game.rooms[roomName].storage.id,Game.rooms[roomName].nuker.id,RESOURCE_GHODIUM,Math.min(Game.rooms[roomName].nuker.store.getFreeCapacity(RESOURCE_GHODIUM),global.resources[roomName][RESOURCE_GHODIUM]["storage"]))
                }else if (global.resources[roomName][RESOURCE_GHODIUM]["factory"]){
                    Game.rooms[roomName].AddTransferTask("defense",Game.rooms[roomName].factory.id,Game.rooms[roomName].nuker.id,RESOURCE_GHODIUM,Math.min(Game.rooms[roomName].nuker.store.getFreeCapacity(RESOURCE_GHODIUM),global.resources[roomName][RESOURCE_GHODIUM]["factory"]))
                }
            }
            // Charge Power
            if (global.resources[roomName][RESOURCE_POWER] && Game.rooms[roomName].powerSpawn && Game.rooms[roomName].powerSpawn.store.getFreeCapacity(RESOURCE_POWER) > 0){
                if (global.resources[roomName][RESOURCE_POWER]["storage"]){
                    Game.rooms[roomName].AddTransferTask("advanced",Game.rooms[roomName].storage.id,Game.rooms[roomName].powerSpawn.id,RESOURCE_POWER,Math.min(global.resources[roomName][RESOURCE_POWER]["storage"],Game.rooms[roomName].powerSpawn.store.getFreeCapacity(RESOURCE_POWER)))
                }else if (global.resources[roomName][RESOURCE_POWER]["terminal"]){
                    Game.rooms[roomName].AddTransferTask("advanced",Game.rooms[roomName].terminal.id,Game.rooms[roomName].powerSpawn.id,RESOURCE_POWER,Math.min(global.resources[roomName][RESOURCE_POWER]["terminal"],Game.rooms[roomName].powerSpawn.store.getFreeCapacity(RESOURCE_POWER)))
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
                            var components = []
                            const component1 = Game.getObjectById(global.labStructures[roomName].core[0]).mineralType
                            const component2 = Game.getObjectById(global.labStructures[roomName].core[1]).mineralType
                            if (Game.rooms[roomName].storage){
                                if (component1 !== _components[0] && component1 !== _components[1]) Game.rooms[roomName].AddTransferTask("advanced",global.labStructures[roomName].core[0],Game.rooms[roomName].storage.id,component1,undefined)
                                if (component2 !== _components[0] && component2 !== _components[1]) Game.rooms[roomName].AddTransferTask("advanced",global.labStructures[roomName].core[1],Game.rooms[roomName].storage.id,component2,undefined)
                            }
                            if (_components[0] !== component1 && _components[0] !== component2) components.push(_components[0])
                            if (_components[1] !== component1 && _components[1] !== component2) components.push(_components[1])
                            if (components.length === 2 && !component1 && !component2){
                                if (global.resources[roomName][components[0]]) Game.rooms[roomName].AddTransferTask("advanced","resource",global.labStructures[roomName].core[0],components[0],undefined)
                                if (global.resources[roomName][components[1]]) Game.rooms[roomName].AddTransferTask("advanced","resource",global.labStructures[roomName].core[1],components[1],undefined)
                            }else if (components.length == 0){
                                if ((component1 === _components[0] || component1 === _components[1]) && global.resources[roomName][component1] && Game.getObjectById(global.labStructures[roomName].core[0]).store.getFreeCapacity(component1) >= 1500){
                                    Game.rooms[roomName].AddTransferTask("advanced","resource",global.labStructures[roomName].core[0],component1,undefined)
                                }
                                if ((component2 === _components[0] || component2 === _components[1]) && global.resources[roomName][component2] && Game.getObjectById(global.labStructures[roomName].core[1]).store.getFreeCapacity(component1) >= 1500){
                                    Game.rooms[roomName].AddTransferTask("advanced","resource",global.labStructures[roomName].core[1],component2,undefined)
                                }
                            }else if (components.length == 1){
                                if (!component1 && global.resources[roomName][components[0]]) Game.rooms[roomName].AddTransferTask("advanced","resource",global.labStructures[roomName].core[0],components[0],undefined)
                                if (!component2 && global.resources[roomName][components[0]]) Game.rooms[roomName].AddTransferTask("advanced","resource",global.labStructures[roomName].core[1],components[0],undefined)
                            }
                            const groups = ["XGroup","YGroup"]
                            if (Game.rooms[roomName].storage){
                                for (var group of global.labStructures[roomName][groups]){
                                    for (var _lab of global.labStructures[roomName][groups][group]){
                                        var lab = Game.getObjectById(_lab)
                                        if (lab.mineralType !== resourceType || lab.store.getFreeCapacity(mineralType) <= 300){
                                            Game.rooms[roomName].AddTransferTask("advanced",_lab,Game.rooms[roomName].storage.id,lab.mineralType,undefined)
                                        }
                                    }
                                }
                            }
                        }
                    }else if (mode === "clear" && Game.rooms[roomName].storage && Game.rooms[roomName].storage.store.getFreeCapacity() > 0){
                        for (var lab of Game.rooms[roomName].labs){
                            if (lab.mineralType) Game.rooms[roomName].AddTransferTask("advanced",lab.id,Game.rooms[roomName].storage.id,lab.mineralType)
                        }
                    }
                }
            }
            // Sell Commodities
            if (terminalConfig.sellingGoods[roomName] && Game.rooms[roomName].terminal && Game.rooms[roomName].terminal.store.getFreeCapacity() > 0){
                for (var info of terminalConfig.sellingGoods[roomName]){
                    const resourceType = info[0]
                    const reservedAmount = info[1]
                    if (!global.resources[roomName][resourceType]) continue
                    if (global.resources[roomName][resourceType]["total"] <= reservedAmount) continue
                    const sellingAmount = global.resources[roomName][resourceType]["total"] - reservedAmount
                    if (global.resources[roomName][resourceType]["factory"]){
                        let amount = Math.min(sellingAmount,global.resources[roomName][resourceType]["factory"],Game.rooms[roomName].terminal.store.getFreeCapacity())
                        Game.rooms[roomName].AddTransferTask("advanced",Game.rooms[roomName].factory.id,Game.rooms[roomName].terminal.id,resourceType,amount)
                    }else if (global.resources[roomName][resourceType]["labs"]){
                        let amount = Math.min(sellingAmount,global.resources[roomName][resourceType]["labs"],Game.rooms[roomName].terminal.store.getFreeCapacity())
                        Game.rooms[roomName].AddTransferTask("advanced","lab",Game.rooms[roomName].terminal.id,resourceType,amount)
                    }else if (global.resources[roomName][resourceType]["storage"]){
                        let amount = Math.min(sellingAmount,global.resources[roomName][resourceType]["storage"],Game.rooms[roomName].terminal.store.getFreeCapacity())
                        Game.rooms[roomName].AddTransferTask("advanced",Game.rooms[roomName].storage.id,Game.rooms[roomName].terminal.id,resourceType,amount)
                    }
                }
            }
        }
        if (!global.task.transfer[roomName]["tombExpirationTime"] || global.task.transfer[roomName]["tombExpirationTime"] <= Game.time){
            global.task.transfer[roomName]["tombExpirationTime"] = Game.time + utils.getCacheExpiration()
            var tombStones = Game.rooms[roomName].find(FIND_TOMBSTONES)
            tombStones.sort((a,b)=>b.store.getUsedCapacity() - a.store.getUsedCapacity())
            for (var tombStone of tombStones){
                Game.rooms[roomName].AddTransferTask("advanced",tombStone.id,Game.rooms[roomName].storage.id,undefined,undefined)
            }
        }
    }
    for (var roomName of global.rooms.observed){
        if (Game.rooms[roomName].controller && Game.rooms[roomName].owner) continue
        const home = utils.getClosetSuitableRoom(roomName,7)
        for (var container of Game.rooms[roomName].containers){
            if (container.store.getUsedCapacity() >= 1000){
                Game.rooms[home].AddTransferTask("advanced",container.id,Game.rooms[home].storage.id,undefined,undefined)
            }
        }
    }
}