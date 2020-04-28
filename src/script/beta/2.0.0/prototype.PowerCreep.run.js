const configPC = require('configuration.PowerCreep')
const utils = require('utils')
const USE_POWER = 100
const NOT_USE_POWER = 101
const INVALID_TASK = 102
const PLACE_HOLDER = "_"
const runExtension = {
    _(){
        return [undefined,NOT_USE_POWER]
    },
    init(){
        if (!this.memory.home) this.memory.home = this.room.name
        if (!this.memory.task) this.memory.task = PLACE_HOLDER
    },
    _opsCheck(powerType){
        if (!this.powers[powerType]) return [INVALID_TASK,NOT_USE_POWER]
        if (this.store[RESOURCE_OPS] < POWER_INFO[powerType].ops) return [ERR_NOT_ENOUGH_RESOURCES,NOT_USE_POWER]
        return [OK,undefined]
    },
    _getTarget(targetType,filterEffect){
        var target_s = this.room[targetType]
        if (target_s === undefined || target_s === []) return undefined
        if (!Array.isArray(target_s)) target_s = [target_s]
        target_s = _.filter(target_s,(structure)=>{
            var existingEffects = _.map(structure.effects,(o)=>o.effect)
            return existingEffects.indexOf(filterEffect) < 0
        })
        if (target_s.length === 0) return undefined
        else {
            target_s.sort((a,b)=>a.pos.getRangeTo(this) - b.pos.getRangeTo(this));
            return target_s[0].id
        }
    },
    _tUP(powerType,targetType){
        var feedback = this["_opsCheck"](powerType)
        if (feedback[0] !== OK) return feedback
        if (!this.memory.target) this.memory.target = this["_getTarget"](targetType,powerType)
        if (this.memory.target){
            if (this.usePower(powerType,Game.getObjectById(this.memory.target)) === ERR_NOT_IN_RANGE) {
                this.travelTo(Game.getObjectById(this.memory.target))
                return [ERR_NOT_IN_RANGE,NOT_USE_POWER]
            }else return [OK,USE_POWER]
        }else return [INVALID_TASK,NOT_USE_POWER]
    },
    oC(){
        return this["_tUP"](PWR_OPERATE_CONTROLLER,"controller")
    },
    oSs(){
        return this["_tUP"](PWR_OPERATE_SPAWN,"spawns")
    },
    oS(){
        return this["_tUP"](PWR_OPERATE_STORAGE,"storage")
    },
    oL(){
        return this["_tUP"](PWR_OPERATE_LAB,"labs")
    },
    oT(){
        return this["_tUP"](PWR_OPERATE_TERMINAL,"terminal")
    },
    oTs(){
        return this["_tUP"](PWR_OPERATE_TOWER,"towers")
    },
    oF(){
        return this["_tUP"](PWR_OPERATE_FACTORY,"factory")
    },
    oO(){
        return this["_tUP"](PWR_OPERATE_OBSERVER,"observer")
    },
    rS(){
        return this["_tUP"](PWR_REGEN_SOURCE,"energys")
    },
    rM(){
        return this["_tUP"](PWR_REGEN_MINERAL,"mineral")
    },
    _renew(){
        if (utils.ownRoom(this.room.name)){
            if (this.room.powerSpawn){
                if (this.renew(this.room.powerSpawn) === ERR_NOT_IN_RANGE) this.travelTo(this.room.powerSpawn)
            }else if (this.room.powerBank){
                if (this.renew(this.room.powerBank) === ERR_NOT_IN_RANGE) this.travelTo(this.room.powerBank)
            }
        }else if (Game.rooms[this.memory.home].powerSpawn){
            if (this.renew(Game.rooms[this.memory.home].powerSpawn) === ERR_NOT_IN_RANGE) this.travelTo(Game.rooms[this.memory.home].powerSpawn)
        }
    },
    _transferSurplus(){
        if (this.store.getFreeCapacity(RESOURCE_OPS) === 0) {
            if (this.room.storage && this.room.storage.store.getFreeCapacity() >= this.store.getUsedCapacity()){
                if (this.transfer(this.room.storage,RESOURCE_OPS) === ERR_NOT_IN_RANGE) this.travelTo(this.room.storage)
                return OK
            }
        }
        return false
    },
    _enableRoom(){
        if (!this.room.controller.isPowerEnabled){
            if (this.enableRoom(this.room.controller) === ERR_NOT_IN_RANGE) this.travelTo(this.room.controller)
            return OK
        }
        return false
    },
    _withdrawOps(){
        if (this.room.terminal && this.room.terminal.store[RESOURCE_OPS] > 0){
            if (this.withdraw(this.room.terminal,RESOURCE_OPS) === ERR_NOT_IN_RANGE) this.travelTo(this.room.terminal)
            return OK
        }else if (this.room.storage && this.room.storage.store[RESOURCE_OPS] > 0){
            if (this.withdraw(this.room.storage,RESOURCE_OPS) === ERR_NOT_IN_RANGE) this.travelTo(this.room.storage)
            return OK
        }
        return false
    },
    run(){
        this.init()
        if (this.ticksToLive <= configPC.renewRemainingTicks) this._renew()
        else{
            var feedback = this[this.memory.task]()
            if (feedback[1] !== USE_POWER && this.className === POWER_CLASS.OPERATOR) this.usePower(PWR_GENERATE_OPS);
            if (feedback[0] === ERR_NOT_ENOUGH_RESOURCES) if (this["_withdrawOps"]) return;
            if (feedback[0] === INVALID_TASK) this.memory.task = PLACE_HOLDER
            if (feedback[0] === OK) return;
            const basicTaskOrder = ["_enableRoom","_transferSurplus"]
            for (var basicTask of basicTaskOrder) if (this[basicTask] === OK) return;
        }
    }
}
_.assign(PowerCreep.prototype,runExtension)