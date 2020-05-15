const towerConfiguration = {
    reservedEnergy:500,
    road:0.8,
    container:0.8,
    "rampart":{
        "0":0,
        "1":0,
        "2":0,
        "3":0,
        "4":0.01,
        "5":0.01,
        "6":0.01,
        "7":0.01,
        "8":0.004
    },
    "wall":{
        "0":0,
        "1":0,
        "2":0,
        "3":0,
        "4":0.0001,
        "5":0.0001,
        "6":0.0001,
        "7":0.0001,
        "8":0.00004
    },
    fullyRepair:[],
    defense:{
        priorityRole:{
            harmless:3,
            attacker:2,
            healer:2,
            advancedAttacker:1,
            advancedArcher:1,
            King:0,
            advancedHealer:1,
        },
        prioritySituation:{
            "health":0,
            "normal":2,
            "damaged":3,
            "weak":1,
            "severe":4,
        }
    }
}
module.exports = towerConfiguration;