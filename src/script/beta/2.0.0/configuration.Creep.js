const creepConfiguration = {
    components:{
        "harvester":{work:5,carry:1,move:3},
        "transferer":{carry:10,move:10},
        "upgrader":{work:8,carry:2,move:5},
        "worker":{work:3,carry:3,move:3},
        "repairer":{work:5,carry:3,move:4},
        "defender":{tough:5,"ranged_attack":20,heal:10,move:15},
        "attacker":{move:10,attack:40},
        "healer":{move:10,heal:30,move:10},
        "claimer":{move:1,claim:1},
        "traveler":{move:1}
    },
    boosts:{
        "transferer":["KH","KH2O"],
    },
    groupAcceptedTask:{
        // PRIMARY KEY PRINCIPLE
        "remoteHarvest":{"harvester":["harvest-remote"],"transferer":["-transfer-remote"]},
        "powerHarvest":{"attacker":["attack-harvest"],"healer":["-attack-heal"],"transferer":["-transfer-remote"]},
        "localHarvest":{"harvester":["harvest-local"]},
        "pureTransfer":{"transferer":["pickup","transfer-core|defense|advanced"]},
        "pureWorker":{"worker":["build","*repair-local","*upgrade"]},
        "pureRepairer":{"repairer":["repair-local","*upgrade"]},
        "remoteRepairer":{"repairer":["repair-remote"]},
        "pureUpgrader":{"upgrader":["upgrade"]},
        "Defend":{"defender":["defend"]},
        "Attack":{"attacker":["attack-attack"],"healer":["-attack-heal"]},
        "Claim":{"claimer":["attack-claim"]},
        "Travel":{"traveler":["travel"]}
    }
}
module.exports = creepConfiguration