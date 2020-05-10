const taskPriorityConfiguration = {
    "spawn":{
        "transferer":{
            "pureTransfer":0,   // Primary
            "remoteHarvest":106,
            "powerHarvest":107,
            "remoteTransfer":106,
            "remotePickUper":5,
        },
        "harvester":{           // Primary
            "remoteHarvest":6,
            "localHarvest":1,
        },
        "upgrader":{            // Primary
            "pureUpgrader":2
        },
        "worker":{              // Primary
            "pureWorker":5
        },
        "repairer":{            // Primary
            "pureRepairer":4,
            "remoteRepairer":9,
        },
        "defender":{            // Primary
            "Defend":3
        },
        "defender_observed":{
            "Defend_observed":3,
        },
        "defender_reserved":{
            "Defend_reserved":3,
        },
        "attacker":{            // Primary
            "Attack":7,
            "powerHarvest":6,
        },
        "healer":{
            "Attack":107,
            "powerHarvest":106,
        },
        "claimer":{             // Primary
            "Claim":7,
        },
        "traveler":{            // Primary
            "Travel":8,
        }
    }
}
module.exports = taskPriorityConfiguration