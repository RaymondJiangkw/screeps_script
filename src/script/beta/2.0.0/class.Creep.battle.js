class BattleCreep{
    static FATIGUE = "fatigue";
    static ROLE_INTEGRATED = "integrated";
    static ROLE_WARRIOR = "warrior";
    static ROLE_PASTOR = "pastor";
    static ERR_HAVE_VALID_ACTION_BEFORE = -20;
    constructor(creep_id = "") {
        this._creep_id = creep_id;
        this._tags = [];
    }
    get tags() {
        if (!this._tags_ts || this._tags_ts !== Game.time) {
            this._tags_ts = Game.time;
            this._tags = [];
            if (this.creep.getActiveBodyparts(ATTACK) > 0) this._tags.push(ATTACK);
            if (this.creep.getActiveBodyparts(RANGED_ATTACK) > 0) this._tags.push(RANGED_ATTACK);
            if (this.creep.getActiveBodyparts(HEAL) > 0) this._tags.push(HEAL);
            var body = _.groupBy(_.filter(this.creep.body,(e)=>e.hits > 0),(e)=>e.type);
            var effects = _.map(body[MOVE] || [],(e)=>e.effects);
            var move_body_parts = this.creep.getActiveBodyparts(MOVE) + _.sum(_.forEach(effects,(value)=>{
                if (value === "ZO") return 1;
                if (value === "ZHO2") return 2;
                if (value === "XZHO2") return 3;
            }));
            const valid_body_parts = Math.ceil(this.creep.hits / this.creep.hitsMax / 100) - move_body_parts;
            if (valid_body_parts <= 0) this._tags.push(MOVE);
            else this._tags.push(FATIGUE);
        }
        return this._tags;
    }
    get role() {
        if (!this._role_ts || this._role_ts !== Game.time) {
            this._role_ts = Game.time;
            var isAttack = this.isTag(ATTACK);
            var isRangedAttack = this.isTag(RANGED_ATTACK);
            var isHeal = this.isTag(HEAL);
            if (isAttack || isRangedAttack) {
                if (isHeal) this._role = ROLE_INTEGRATED;
                else this._role = ROLE_WARRIOR;
            }else if (isHeal) this._role = ROLE_PASTOR;
        }
        return this._role;
    }
    get id() {
        return this._creep_id;
    }
    get creep() {
        if (!this._creep_ts || this._creep_ts !== Game.time) {
            this._creep = Game.getObjectById(this._creep_id);
            this._creep_ts = Game.time;
        }
        return this._creep;
    }
    get locks() {
        if (!this._locks_ts || this._locks_ts !== Game.time) {
            this._locks = {
                attack:false,
                rangedAttack:false,
                rangedMassAttack:false,
                heal:false,
                rangedHeal:false,
            }
            this._locks_ts = Game.time;
        }
        return this._locks;
    }
    get pos(){
        return this.creep.pos;
    }
    isTag(tag) {
        return this.tags.indexOf(tag) >= 0;
    }
    moveTo() {
        return this.creep.moveTo(arguments);
    }
    move() {
        return this.creep.move(arguments);
    }
    recycle(){
        delete this._creep;
        return true;
    }
    getRangeTo(){
        return this.creep.pos.getRangeTo(arguments);
    }
    inRangeTo(){
        return this.creep.pos.inRangeTo(arguments);
    }
    attack(target){
        if (this.locks.heal) return ERR_HAVE_VALID_ACTION_BEFORE;
        var feedback = this.creep.attack(target)
        if (feedback === OK) this.locks.attack = true;
        return feedback;
    }
    rangedAttack(target){
        if (this.locks.rangedHeal || this.locks.rangedMassAttack) return ERR_HAVE_VALID_ACTION_BEFORE;
        var feedback = this.creep.rangedAttack(target)
        if (feedback === OK) this.locks.rangedAttack = true;
        return feedback;
    }
    heal(target){
        if (this.locks.attack) return ERR_HAVE_VALID_ACTION_BEFORE;
        var feedback = this.creep.heal(target);
        if (feedback === OK) this.locks.heal = true;
        return feedback;
    }
    rangedHeal(target){
        if (this.locks.rangedAttack || this.locks.rangedHeal) return ERR_HAVE_VALID_ACTION_BEFORE;
        var feedback = this.creep.rangedHeal(target);
        if (feedback === OK) this.locks.rangedHeal = true;
        return feedback;
    }
    rangedMassAttack(target){
        if (this.locks.rangedAttack || this.locks.rangedHeal) return ERR_HAVE_VALID_ACTION_BEFORE;
        var feedback = this.creep.rangedMassAttack(target);
        if (feedback === OK) this.locks.rangedMassAttack = true;
        return feedback;
    }
}
class GroupCreeps{
    constructor(creeps_id = []) {
        this._creeps_id = creeps_id;
    }
    get creeps() {
        if (!this._creeps_ts || this._creeps_ts !== Game.time) {
            this._creeps_ts = Game.time;
            this._creeps = [];
            for (var role in this.battleCreeps) {
                for (var battleCreep of this.battleCreeps[role]) this._creeps.push(battleCreep);
            }
        }
        return this._creeps;
    }
    get battleCreeps() {
        if (!this._battleCreeps_ts || this._battleCreeps_ts !== Game.time) {
            var battleCreeps = _.forEach(this._creeps_id,(value)=>new BattleCreep(value));
            this._battleCreeps = _.groupBy(battleCreeps,(value)=>value.role);
            this._battleCreeps_ts = Game.time;
        }
        return this._battleCreeps;
    }
    recycle(){
        for (var battleCreep of this.creeps) battleCreep.recycle();
        return true;
    }
    rangedAttack(target){
        for (var creep of [].concat(this.battleCreeps["warrior"] || [],this.battleCreeps["integrated"] || [])) creep.rangedAttack(target);
    }
    attack(target){
        for (var creep of [].concat(this.battleCreeps["warrior"] || [],this.battleCreeps["integrated"] || [])) creep.attack(target);
    }
    rangedMassAttack(target){
        for (var creep of [].concat(this.battleCreeps["warrior"] || [],this.battleCreeps["integrated"] || [])) creep.rangedMassAttack(target);
    }
    heal(){
        for (var creep of [].concat(this.battleCreeps["pastor"] || [],this.battleCreeps["integrated"] || [])) {
            if (creep.hits < creep.hitsMax) creep.heal(creep.creep);
            else {
                for (var _creep of this.creeps) {
                    if (_creep.hits < _creep.hitsMax && creep.heal(_creep.creep) === OK) break;
                }
            }
        }
    }
    rangedHeal(){
        for (var creep of [].concat(this.battleCreeps["pastor"] || [],this.battleCreeps["integrated"] || [])) {
            for (var _creep of this.creeps) {
                if (_creep.hits < _creep.hitsMax && creep.rangedHeal(_creep.creep) === OK) break;
            }
        }
    }
}