/*Creep Memory
home :: spawnHome
role :: Job
hasBoosted :: the parts has already been boosted
neededBoosted :: the all parts should be boosted
boostDiffArr :: the parts waiting to be boosted

targetRoom :: attacker/claimer target Room

iftransfering, boolean :: whether begin to transfer the minerals stored in the cachedMineral Container

harvestContainerTarget :: target of harvesting the container

chargeTarget :: target of charging the defense

targetId :: target to attack

targetResource :: compounds transfer to the lab [Type,RemainingAmount]
targetRetrieve :: the target to retrieve to transfer to the lab

targetLab :: the target lab to transfer compound

targetLabExhaust :: the target lab to exhaust basic mineral
labExhuastMineralType :: the mineralType

hasPickUp :: whether the creep has picked up something

hasGoods :: whether the creep has carried goods
marketTarget :: Array [structureID,Type] :: info about transfering goods to the terminal

Storing Behavior will reset all, so be careful
signals(Guidelines for carrying resources):
    building, boolean :: whether has carried energy
    mineralTransfer, boolean :: whether has carried EXTRACTIVE minerals
    labTransfer, boolean :: whether has carried compounds
    labExhaust, boolean :: whether has carried lab's surplus basic minerals
    marketTransfer, boolean :: whether has carried goods
    storing, boolean :: whether has carried dropped out resources
    
*/
const referenceModule = {
    assess:{
        economy:{
            assessRatio:{
                "available":0.7,
                "backUp":0.2,
                "storage":0.1
            },
            availableRatio:{
                "0":0.9,
                "1":0.8,
                "2":0.7,
                "3":0.5,
                "4":0
            },
            backUpRatio:{
                "0":0.8,
                "1":0.6,
                "2":0.5,
                "3":0.4,
                "4":0
            },
            storageAmount:{
                "0":100000,
                "1":80000,
                "2":50000,
                "3":30000,
                "4":0
            }
        },
        repair:{
            assessRatio:{
                average:{
                    "structure":0.5,
                    "core":0.5
                },
                min:{
                    "structure":1,
                    "core":1
                }
            },
            bearableHitLevel:"1",
            hitRatio:{
                "0":0.8,
                "1":0.7,
                "2":0.6,
                "3":0
            },
            downgradeFactor:{
                "0":1.0,
                "1":1.0,
                "2":0.8,
                "3":0.6,
                "4":0.4,
                "5":0.2
            },
            defendnCoreRatio:{
                "0":1,
                "1":1,
                "2":1,
                "3":0
            },
            structureRank:{
                STRUCTURE_SPAWN:0,
                STRUCTURE_TOWER:1,
                STRUCTURE_STORAGE:2,
                STRUCTURE_EXTENSION:3,
                STRUCTURE_TERMINAL:4,
                STRUCTURE_EXTRACTOR:5,
                STRUCTURE_LINK:6,
                STRUCTURE_FACTORY:7,
                STRUCTURE_LAB:8
            },
            strengthenDefense:{
                "rampart":{
                    "0":0,
                    "1":0,
                    "2":0,
                    "3":0,
                    "4":0,
                    "5":0.01,
                    "6":0.01,
                    "7":0.01,
                    "8":1
                },
                "wall":{
                    "0":0,
                    "1":0,
                    "2":0,
                    "3":0,
                    "4":0,
                    "5":0.00001,
                    "6":0.0001,
                    "7":0.001,
                    "8":0.0004
                }
            }
        },
        war:{
            assessAmount:{
                0:50,
                1:10,
                2:5,
                3:1,
                4:0
            }
        },
        work:{
            tower:{
                leastWarEnergyRatio:0.5,
            },
            creep:{
                stopWorkingTick:1,
                containerWaitingBearableTimeInterval:15,
                harvestTerminalReservedEnergyEconomyLevel:2.5,
                task:{
                    transfer:{
                        reserved:{
                            energyEconomyLevel:3,
                            mineralNum:0
                        }
                    }
                },
            },
            build:{
                helpBuildControllerLevel:2,
                helpBuildHomeControllerLevel:8
            },
        }
    },
    task:{
        "Travel":{
            "W22N25":{
                "travelW23N25":{
                    targetRoom:"W23N25",
                    standard:"Game.rooms[targetRoom].storage && Game.rooms[targetRoom].storage.store.getUsedCapacity(RESOURCE_ENERGY) >= 0.5 * 1000000",
                    trigger:{
                        call:["Spawn","W22N25","spawnTraveler"],
                        condition:"Game.spawns['Origin'].memory.assess.access.creeps[hostRoom].travelers < Game.spawns['Origin'].memory.task.travel[hostRoom].taskList.length - 1"
                    },
                    params:{
                        targetRoomName:"W23N25",
                        structureType:STRUCTURE_STORAGE,
                        resourceType:RESOURCE_ENERGY,
                        stopAmount:0.3*1000000
                    }
                },}
        },
        "Spawn":{
            "W22N25":{
                "spawnTraveler":{
                    targetRoom:"W22N25",
                    standard:"false",
                    trigger:{
                        condition:"false",
                        call:["","",""]
                    },
                    params:{
                        role:"traveler",
                        components:{carry:10,move:5},
                        "_memory":{
                            acceptedTask:["travel"],
                            group:undefined
                        }
                    }
                },}
        }
    },
    spawn:{
        num:{
            "harvester":1,
            "builder":1,
            "upgrader":1,
            "pickuper":{
                "4":1,
                "5":1,
                "6":1,
                "7":1,
                "8":2
            }
        },
        worker:{work:2,carry:3,move:4},
        upgrader:{work:8,carry:2,move:4},
        transferer:{work:5,carry:1,move:2},
        miner:{work:5,carry:2,move:6},
        repairer:{work:3,carry:3,move:6},
        pickuper:{tough:1,carry:5,move:6},
        attacker:{tough:1,attack:5,move:8},
        claimer:{claim:1,move:5},
        "BODYPART_COST": {move: 50, work: 100, attack: 80, carry: 50, heal: 250, "ranged_attack": 150, tough: 10, claim: 600 },
        getTotalCost:function(spawnSet){
            let totalCost = 0
            for (let bodypart in this.BODYPART_COST) {
                if (bodypart in spawnSet) {
                    totalCost += this.BODYPART_COST[bodypart] * spawnSet[bodypart]
                }
            }
            return totalCost
        },
        getRatio:function(spawnSet){
            let spawnRatio = {}
            const totalCost = this.getTotalCost(spawnSet)
            for (let bodypart in spawnSet) {
                spawnRatio[bodypart] = (this.BODYPART_COST[bodypart]*spawnSet[bodypart]) / totalCost
            }
            return spawnRatio
        },
        timeInterval:50, // Set to ensure many creeps do not die at the same time which exerts hugh pressure on the system of storage
    },
    work:{
        // Always have an argument of absolute executing
        // S means sending signal
        interpret:{
            "0":"chargeEnergy",
            "1":"build",
            "2":"upgrade",
            "3":"store",
            "4":"chargeDefense",
            "5":"repair",
            "6":"defendTower",
            "7":"SpickUp",
            "8":"claim",
            "9":"attack",
            "10":"heal",
            "11":"chargeLink",
            "12":"ScontainerHarvest",
            "13":"SresourceHarvest",
            "14":"SmineralHarvest",
            "15":"SstorageHarvest",
            "16":"SlinkUpdateHarvest",
            "17":"SlinkStorageHarvest",
            "18":"SmineralContainerHarvest",
            "19":"strengthenTower",
            "20":"chargeLabFactory",
            "21":"ScompoundLabRetrieve",
            "22":"compoundLabTransfer",
            "23":"ScompoundMarketRetrieve",
            "24":"compoundMarketTransfer",
            "25":"SgeneralRetrieve",
            "26":"generalTransfer",
            "27":"chargePower",
            "28":"SexhuastLab",
            "29":"StaskTravel",
            "30":"receiveTask"
        },
        standard:{
            standardNum:4,
            "0":{
                standard:"true",
                call:"normalJob"
            },
            "1":{
                standard:"Game.spawns['Origin'].memory.assess.access.stateLevel.repair[roomName]>=2",
                call:"repairJob"
            },
            "2":{
                standard:"Game.spawns['Origin'].memory.assess.access.stateLevel.economy[roomName]>=2",
                call:"economyJob"
            },
            "3":{
                standard:"Game.spawns['Origin'].memory.assess.access.stateLevel.war[roomName]!=4",
                call:"warJob"
            }
        },
        normalJob:{
            harvester:"12-13-0-3-4-1-20-2-3",
            builder:"15-12-13-1-0-4-20-2-12-13-15",
            transferer:"13-11-13",
            upgrader:"16-12-13-2-16",
            repairer:"12-13-5-4-0-1-2-12-13",
            miner:"14-Game.spawns['Origin'].memory.assess.access.creeps[roomName].pickupers>0?14:3-14",
            pickuper:"18-7-21-25-23-28-4-26-22-24-3",
            tower:"6-5-19-5",
            attacker:"9",
            claimer:"8",
            traveler:"30-29-3"
        },
        economyJob:{
            harvester:"15-12-13-0-4-3-1-2-15-12-13",
            builder:"12-13-0-1-4-2-12-15-13",
            repairer:"12-13-0-4-5-1-2-12-13",
            pickuper:"15-18-7-21-25-28-24-26-22-0-3",
            tower:"6-5",
        },
        repairJob:{
            harvester:"12-13-0-4-5-3-1-2-12-13",
            builder:"12-13-4-1-0-5-2-12-13",
            repairer:"15-12-13-5-4-0-1-2-12-13",
            pickuper:"18-7-21-25-15-28-24-26-22-4-3",
            tower:"6-5",
        },
        warJob:{
            harvester:"15-12-13-4-0-3-1-2-15-12-13",
            builder:"12-13-4-1-0-2-12-15-13",
            repairer:"12-13-4-0-5-1-2-12-13",
            pickuper:"15-18-7-21-25-28-24-26-22-4-3",
            tower:"6",
        }
    },
    market:{
        general:{
            space:{
                inventory:0.5,
                transaction:0.5
            },
            fullSpace:300000,
            getInventorySpace:function(){return this.fullSpace * this.space.inventory},
            getTransactionSpace:function(){return this.fullSpace * this.space.transaction}
        },
        buy:{ // inventory
            reservedEnergy:0.2, // Energy should not be automatically sold in case of buying energy
        },
        sell:{ // transaction
            sellingMineral:0.8,
            reservedEnergy:0.2,
            // These two are ordered, the former one will be sold first, the after ones will be sold 
            // when and only when the former ones have all been sold to a propriate degree
            commodities:[RESOURCE_GHODIUM_MELT], // meaning only sell do not reserve
            compounds:[]
        },
        storage:{ // Reserved some amount
            lab:{
                compound:90
            },
            storage:{
                beginEconomyLevel:1,
                mineral:10000,
                compound:5000
            }
        },
        getReservedEnergy:function(){return this.general.getInventorySpace() * this.buy.reservedEnergy},
        getSellingEnergy:function(){return this.general.getTransactionSpace() * this.sell.reservedEnergy},
        getSellingMineral:function(){return this.general.getTransactionSpace() * this.sell.sellingMineral}
    },
    production:{
        // All compound information in lab are sustain-number, thus should not be larger than 3000
        lab:{
            requiredEconomyLevel:0.5,
            minBoostEnergy:20,
            minBoostCompound:30,
            allowedCompounds:{ // Controller Level -> Role -> Cached Amount
            /* Basic Ideas
                Since each room only has limited resources, it's more wise to produce one type, and buy the other.
                Thus, in order to control, we needed to automatically produce and manually buy(may switch to automatically)
                the products or original minerals.
                In the process of running, the programme will filter out the needed compounds and produces them only when
                they are enough available.
            */
                "0":{},
                "1":{},
                "2":{},
                "3":{},
                "4":{},
                "5":{},
                "6":{
                    "pickuper":{
                        "KH":3000
                    }
                },
                "7":{
                    "miner":{
                        //"UO":0,
                    },
                    "builder":{
                        //"LH":1500,
                    },
                    "upgrader":{
                        //"GH":0,
                    },
                    "repairer":{
                        "LH2O":1500,
                    },
                    "pickuper":{
                        "KH":3000,
                    },
                    "traveler":{
                        "KH":600
                    },
                    "goods":{
                        "G":0
                    }
                },
                "8":{
                    "goods":{
                        "G":3000
                    }
                }
            },
            allowedStack:[],
            reversedCompounds:[], // [[type,amount]]
            basicIngredients:[RESOURCE_OXYGEN,RESOURCE_HYDROGEN,RESOURCE_UTRIUM,RESOURCE_KEANIUM,RESOURCE_LEMERGIUM,RESOURCE_ZYNTHIUM,RESOURCE_CATALYST],
            formula:{
                "OH":["H","O"],
                "ZK":["Z","K"],
                "UL":["U","L"],
                "G":["ZK","UL"],
                "UH":["U","H"],
                "UO":["U","O"],
                "KH":["K","H"],
                "KO":["K","O"],
                "LH":["L","H"],
                "LO":["L","O"],
                "ZH":["Z","H"],
                "ZO":["Z","O"],
                "GH":["G","H"],
                "GO":["G","O"],
                "UH2O":["UH","OH"],
                "UHO2":["UO","OH"],
                "KH2O":["KH","OH"],
                "KHO2":["KO","OH"],
                "LH2O":["LH","OH"],
                "LHO2":["LO","OH"],
                "ZH2O":["ZH","OH"],
                "ZHO2":["ZO","OH"],
                "GH2O":["GH","OH"],
                "GHO2":["GO","OH"],
                "XUH2O":["UH2O","X"],
                "XUHO2":["UHO2","X"],
                "XKH2O":["KH2O","X"],
                "XKHO2":["KHO2","X"],
                "XLH2O":["LH2O","X"],
                "XLHO2":["LHO2","X"],
                "XZH2O":["ZH2O","X"],
                "XZHO2":["ZHO2","X"],
                "XGH2O":["GH2O","X"],
                "XGHO2":["GHO2","X"]
            },
            effect:{
                "UH":"attack",
                "UO":"work",
                "KH":"carry",
                "KO":"ranged_attack",
                "LH":"work",
                "LO":"heal",
                "ZH":"work",
                "ZO":"move",
                "GH":"work",
                "GO":"tough",
                "UH2O":"attack",
                "UHO2":"work",
                "KH2O":"carry",
                "KHO2":"ranged_attack",
                "LH2O":"work",
                "LHO2":"heal",
                "ZH2O":"work",
                "ZHO2":"move",
                "GH2O":"work",
                "GHO2":"tough",
                "XUH2O":"attack",
                "XUHO2":"work",
                "XKH2O":"carry",
                "XKHO2":"ranged_attack",
                "XLH2O":"work",
                "XLHO2":"heal",
                "XZH2O":"work",
                "XZHO2":"move",
                "XGH2O":"work",
                "XGHO2":"tough"
            }
        },
        factory:{
            stored:{
                energy:10000,
                allowedCompound:[]
            },
            reaction:{
                "default":['ghodium_melt']
            },
            formula:{
                'ghodium_melt':[[RESOURCE_GHODIUM,500],[RESOURCE_ENERGY]]
            }
        }
    },
    defense:{
        settings:{
            fillNuker:true
        }
    },
    constants:{
        resourceList:[
            RESOURCE_HYDROGEN,
            RESOURCE_OXYGEN,
            RESOURCE_UTRIUM,
            RESOURCE_LEMERGIUM,
            RESOURCE_KEANIUM,
            RESOURCE_ZYNTHIUM,
            RESOURCE_CATALYST,
            RESOURCE_GHODIUM,
            RESOURCE_SILICON,
            RESOURCE_METAL,
            RESOURCE_BIOMASS,
            RESOURCE_MIST,
            RESOURCE_HYDROXIDE,
            RESOURCE_ZYNTHIUM_KEANITE,
            RESOURCE_UTRIUM_LEMERGITE,
            RESOURCE_UTRIUM_HYDRIDE,
            RESOURCE_UTRIUM_OXIDE,
            RESOURCE_KEANIUM_HYDRIDE,
            RESOURCE_KEANIUM_OXIDE,
            RESOURCE_LEMERGIUM_HYDRIDE,
            RESOURCE_LEMERGIUM_OXIDE,
            RESOURCE_ZYNTHIUM_HYDRIDE,
            RESOURCE_ZYNTHIUM_OXIDE,
            RESOURCE_GHODIUM_HYDRIDE,
            RESOURCE_GHODIUM_OXIDE,
            RESOURCE_UTRIUM_ACID,
            RESOURCE_UTRIUM_ALKALIDE,
            RESOURCE_KEANIUM_ACID,
            RESOURCE_KEANIUM_ALKALIDE,
            RESOURCE_LEMERGIUM_ACID,
            RESOURCE_LEMERGIUM_ALKALIDE,
            RESOURCE_ZYNTHIUM_ACID,
            RESOURCE_ZYNTHIUM_ALKALIDE,
            RESOURCE_GHODIUM_ACID,
            RESOURCE_GHODIUM_ALKALIDE,
            RESOURCE_CATALYZED_UTRIUM_ACID,
            RESOURCE_CATALYZED_UTRIUM_ALKALIDE,
            RESOURCE_CATALYZED_KEANIUM_ACID,
            RESOURCE_CATALYZED_KEANIUM_ALKALIDE,
            RESOURCE_CATALYZED_LEMERGIUM_ACID,
            RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,
            RESOURCE_CATALYZED_ZYNTHIUM_ACID,
            RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
            RESOURCE_CATALYZED_GHODIUM_ACID,
            RESOURCE_CATALYZED_GHODIUM_ALKALIDE,
            RESOURCE_OPS,
            RESOURCE_UTRIUM_BAR,
            RESOURCE_LEMERGIUM_BAR,
            RESOURCE_ZYNTHIUM_BAR,
            RESOURCE_KEANIUM_BAR,
            RESOURCE_GHODIUM_MELT,
            RESOURCE_OXIDANT,
            RESOURCE_REDUCTANT,
            RESOURCE_PURIFIER,
            RESOURCE_BATTERY,
            RESOURCE_COMPOSITE,
            RESOURCE_CRYSTAL,
            RESOURCE_LIQUID,
            RESOURCE_WIRE,
            RESOURCE_SWITCH,
            RESOURCE_TRANSISTOR,
            RESOURCE_MICROCHIP,
            RESOURCE_CIRCUIT,
            RESOURCE_DEVICE,
            RESOURCE_CELL,
            RESOURCE_PHLEGM,
            RESOURCE_TISSUE,
            RESOURCE_MUSCLE,
            RESOURCE_ORGANOID,
            RESOURCE_ORGANISM,
            RESOURCE_ALLOY,
            RESOURCE_TUBE,
            RESOURCE_FIXTURES,
            RESOURCE_FRAME,
            RESOURCE_HYDRAULICS,
            RESOURCE_MACHINE,
            RESOURCE_CONDENSATE,
            RESOURCE_CONCENTRATE,
            RESOURCE_EXTRACT,
            RESOURCE_SPIRIT,
            RESOURCE_EMANATION,
            RESOURCE_ESSENCE,
            RESOURCE_ENERGY,
        ]
    }
}
module.exports = referenceModule
