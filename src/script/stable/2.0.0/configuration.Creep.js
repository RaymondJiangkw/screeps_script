const creepConfiguration = {
    prototypes:{
        "harvester":{move:3,work:5,carry:1},
        "harvester_remote":{move:8,work:15,carry:1},

        "transferer":{move:10,carry:10},
        "transferer_assistant":{move:1,carry:1},
        "transferer_remote":{move:20,carry:20},

        "upgrader_high":{move:6,work:10,carry:2},
        "upgrader_medium":{move:3,work:5,carry:1},
        "upgrader_low":{move:1,work:1,carry:1},

        "worker_local":{move:10,work:5,carry:15},
        "worker_remote":{move:20,work:5,carry:15},

        "repairer":{work:5,carry:3,move:4},

        "defender_reserved":{move:12,"ranged_attack":5,attack:5,heal:2},
        "defender_observed":{tough:3,attack:2,move:25,"ranged_attack":15,heal:5},

        "attacker_power":{move:25,attack:25},

        "healer_power":{move:16,heal:16},

        "claimer_high":{move:2,claim:2},
        "claimer_low":{move:1,claim:1},
        
        "traveler":{move:1},
        "traveler_aggressive":{move:1,attack:1},
        "traveler_passive":{move:1,heal:1},
    },
    boosts:{
        "transferer":{
            "pureTransfer":["KH","KH2O","XKH2O"],
        },
        "transferer_remote":{
            "remoteHarvest":["KH"],
            "remoteTransfer":["KH","KH2O","XKH2O"],
            "remotePickUper":[],
        },
        "repairer":{
            "pureRepairer":["LH","LH2O","XLH2O"],
        },
        "upgrader_high":{
            "pureUpgrader":["GH","GH2O","XGH2O"],
        },
        "upgrader_medium":{
            "pureUpgrader":["GH","GH2O","XGH2O"],
        },
        "defender_observed":{
            "Defend_observed":["LO","LHO2","XLHO2","GO","GHO2","XGHO2"]
        }
    },
    groupsConfig:{
        // PRIMARY KEY PRINCIPLE
        "remoteHarvest":{members:["harvester_remote","transferer_remote"],acceptedTasks:["harvest-remote"]},
        "localHarvest":{members:["harvester"],acceptedTasks:["harvest-local"]},
        "powerHarvest":{members:["attacker_power","healer_power"],acceptedTasks:["attack-harvest"]},

        "assiTransfer":{members:["transferer_assistant"],acceptedTasks:["transfer-assi"]},
        "localTransfer":{members:["transferer"],acceptedTasks:["transfer-core","transfer-defense","pickup-local","transfer-basic","transfer-advanced"]},
        "remoteTransfer":{members:["transferer_remote"],acceptedTasks:["transfer-remote","transfer-aid"]},
        "remotePickUp":{members:["transferer"],acceptedTasks:["pickup-remote"]},

        "localWork":{members:["worker_local"],acceptedTasks:["build-local","*transfer-core","*transfer-defense","*repair-local","*upgrade"]},
        "remoteWork":{members:["worker_remote"],acceptedTasks:["build-remote"]},

        "localRepair":{members:["repairer"],acceptedTasks:["repair-local","*transfer-core","*transfer-defense","*upgrade"]},
        "remoteRepair":{members:["repairer"],acceptedTasks:["repair-remote"]},
        
        "highUpgrade":{members:["upgrader_high"],acceptedTasks:["upgrade"]},
        "mediumUpgrade":{members:["upgrader_medium"],acceptedTasks:["upgrade"]},
        "lowUpgrade":{members:["upgrader_low"],acceptedTasks:["upgrade"]},

        "defendReserved":{members:["defender_reserved"],acceptedTasks:["defend-reserved"]},
        "defendObserved":{members:["defender_observed"],acceptedTasks:["defend-observed"]},

        "highClaim":{members:["claimer_high"],acceptedTasks:["attack-claim"]},
        "lowClaim":{members:["claimer_low"],acceptedTasks:["attack-claim"]},

        "pureTravel":{"traveler":["travel"]},
        "aggressiveTravel":{"traveler_aggressive":["travel"]},
        "passiveTravel":{"traveler_passive":["travel"]},
    },
    groupSpawnConfig:{
        "powerHarvest":{"healer_power":2},
    }
}
module.exports = creepConfiguration