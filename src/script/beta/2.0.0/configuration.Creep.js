const creepConfiguration = {
    components:{
        "harvester":{move:3,work:5,carry:1},
        "transferer":{move:10,carry:10},
        "upgrader":{move:6,work:10,carry:2},
        "worker":{work:3,carry:3,move:3},
        "repairer":{work:5,carry:3,move:4},
        "defender":{tough:5,"ranged_attack":20,heal:10,move:15},
        "attacker":{move:10,attack:40},
        "healer":{move:10,heal:30,move:10},
        "claimer":{move:1,claim:1},
        "traveler":{move:1,heal:1}
    },
    boosts:{
        "transferer":["KH","KH2O"],
    },
    groupAcceptedTask:{
        // PRIMARY KEY PRINCIPLE
        "remoteHarvest":{"harvester":["harvest-remote"],"transferer":["-transfer-remote"]},
        "powerHarvest":{"attacker":["attack-harvest"],"healer":["-attack-heal"],"transferer":["-transfer-remote"]},
        "localHarvest":{"harvester":["harvest-local"]},
        "pureTransfer":{"transferer":["transfer-core","transfer-defense","pickup","transfer-advanced"]},
        "pureWorker":{"worker":["build-local","build-remote","*transfer-core","*repair-local","*upgrade"]},
        "pureRepairer":{"repairer":["repair-local","*transfer-core","*upgrade"]},
        "remoteRepairer":{"repairer":["repair-remote","build-remote"]},
        "pureUpgrader":{"upgrader":["upgrade"]},
        "Defend":{"defender":["defend"]},
        "Attack":{"attacker":["attack-attack"],"healer":["-attack-heal"]},
        "Claim":{"claimer":["attack-claim"]},
        "Travel":{"traveler":["travel"]}
    }
}
module.exports = creepConfiguration