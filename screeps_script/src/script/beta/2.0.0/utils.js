const constants = require('constants')
const creepConfig = require('configuration.Creep')
const labConfig = require('configuration.Lab')
const acceptableDepositCooldownTime = require('configuration.Deposit').acceptableLastCoolDown
var SaltList = {}
var SaltListExpiration = 0;
var creepsCollection = {}
var creepsCollectionExpiration = 0;

const _fingerprintCached    =   {};

const CACHE_TIMEOUT         =   50;
const CACHE_OFFSET          =   5;

const HASH_P                =   1000000007;

let X_POWERS              =   [1,31,961,29791,923521,28629151,887503681,512613922,891031477,621975598,281243405,718545499,274910315,522219709,188810867,853136842,447241920,864499429,799482117,783945459,302309061,371580828,519005591,89173209,764369465,695453254,559050727,330572418,247744888,680091479,82835702,567906748,605109069,758381013,509811242,804148397,928600139,786604113,384727335,926547308,722966352,411956758,770659414,890441673,603691674,714441768,147694654,578534246,934561507,971406521,113601941,521660150,171464538,315400643,777419870,100015802,100489841,115185050,570736529,692832280,477800533,811816425,166309000,155578965,822947887,511384322,852913877,440330005,650230064,157131844,871087136,3701027,114731837,556686926,257294587,976132148,260096378,62987662,952617515,531142762,465425510,428190712,273911981,491271355,229411900,111768851,464834360,409865062,705816838,880321831,289976572,989273676,667483746,691995986,451875419,8137891,252274621,820513202,435909087,513181606,908629681,167519915,193117330,986637195,585752835,158337759,908470501,162585335,40145350,244505843,579681084,970113485,73517825,279052561,650629335,169509245,254786560,898383311,849882452,346355830,737030660,847950306,286459304,880238368,287389219,909065733,181037527,612163302,977062236,288929106,956802230,660868927,486936597,95034402,946066448,328059685,169850165,265355080,226007424,6230095,193132945,987121260,600758850,623524224,329250811,206775071,410027159,710841845,36097041,119008264,689256163,366940906,375168009,630208202,536454129,630077887,532414364,504845172,650200227,156206897,842413779,114826967,559635956,348714517,810149957,114648492,554103231,177200042,493201267,289239172,966414276,958842353,724112740,447494786,872338275,42486336,317076409,829368616,710426921,23234397,720266307,328255363,175916183,453401638,55450680,718971073,288103109,931196323,867085817,879660145,269464306,353393430,955196260,611083857,943599441,251582468,799056459,770750061,893251730,690803441,414906524,862102160,725166778,480169964,885268786,443332177,743297396,42219115,308792558,572569235,749646166,239030985,409960486,708774982,972024295,132752935,115340957,575569646,842658907,122425935,795203964,651322716,191004056,921125701,554896535,201792466,255566404,922558475,599312529,578688273,939336344,119426461,702220270,768828223,833674752,843917137,161431065,4362980,135252380,192823752,977536277,303624377,412355624,783024260,273751892,486308596,75566371,342557487,619282027,197742704,130023782,30737214,952853634,538462451,692335869,462411792,334765454,377729004,709599047,997570310,924679400,665061204,616897184,123812571,838189680,983879905,500276845,508582090,766044685,747385074,168937133,237051088,348583679,806093979,988913181,656308401,345560291,712368951,83437327,586557123,183270687,681391262,123128975,816998204,326944149,135268549,193324991,993074686,785315056,344766568,687763538,320669531,940755398,163417135,65931150,43865636,359834709,154875902,801152934,835740786,907964191,146889725,553581447,161024738,991766850,744772140,87936179,726021535,506667431,706690256,907397789,129331263,9269125,287342875,907629069,136500943,231529205,177405306,499564451,486497876,81434051,524455567,258122465,1796359,55687129,726300992,515330598,975248433,232701213,213737554,625864132,401787959,455426645,118225897,665002786,615086226,67672873,97859049,33630498,42545431,318908354,886158911,470926052,598707514,559932808,357916929,95424722,958166368,703157205,797873208,734069280,756147526,440573145,657767404,390789384,114470820,548595399,6457250,200174750,205417208,367933406,405935509,584000695,104021419,224663968,964582966,902071743,964223844,890938961,619107602,192335529,962401364,834442081,867704336,898834234,863861065,779692833,170477655,284807270,829025314,699784559,693321182,492956495,281651240,731188384,666839750,672032110,832995270,822853195,508448870,761914865,619360654,200180141,205584329,373114157,566538790,562702371,443773382,756974751,466217120,452730622,34649184,74124697,297865593,233833320,248832871,713818952,128387358,980008077,380250177,787755410,420417542,32943711,21255034,658906054,426087534,208713463,470117311,573636543,782732714,264713966,206132890,390119548,93705904,904883010,51373114,592566527,369562211,456428464,149282286,627750838,460275845,268551097,325083951,77602411,405674727,575916453,853409924,455707462,126931224,934867923,980905417,408067717,650099143,153073293,745272055,103433544,206439843,399635091,388687737,49319763,528912646,396291914,285049250,836526694,932327339,902147313,966566514,963561731,870413458,982817016,467327286,487145768,101518703,147079772,559472904,343659905,653456985,257166395,972158196,136903866,244019818,564614309,503043460,594347155,424761679,167611958,195970663,75090511,327805827,161980567,21397542,663323802,563037722,454169263,79247055,456658691,156419323,848998985,318968353,888018880,528585091,386137709,970268902,78335752,428408298,280657147,700371501,711516384,57007750,767240243,784447372,317868364,853919221,471495669,616365641,107334738,327376857,148682497,609157379,883878623,400237124];

const _getHash = (str) => {
    let hash = 0;
    for (let _ = 0; _ < str.length; _++) {
        const ascii = str.charCodeAt(_);
        if (ascii > 256 || ascii < 0) continue;
        hash += ascii * X_POWERS[_];
        hash %= HASH_P;
    }
    return hash.toString(16);
}
/**
 * Copy the object.
 * @param {Object} object The expected copied object.
 */
const _copy = (object) => JSON.parse(JSON.stringify(object));
/**
 * Replace the useless symbols in string.
 * @param {String} str The expected stripped string.
 */
const _strip = function (str) {
    const USELESS_SYMBOLS = [",","{","}"," ","'",'"',":"];
    for (const symbol of USELESS_SYMBOLS) str = str.replace(symbol,"");
    return str;
}

const utilsCollection = {
    disPos:function(pos1,pos2){
        let x_diff = Math.abs(pos1.x - pos2.x)
        let y_diff = Math.abs(pos1.y - pos2.y)
        return [x_diff,y_diff]
    },
    distancePos:function(pos1,pos2){
        var _ = this.disPos(pos1,pos2)
        return _[0] + _[1]
    },
    adjacentPos:function(pos1,pos2, distance = 1){
        const dist = this.disPos(pos1,pos2)
        return dist[0] <= distance && dist[1] <= distance && pos1.roomName === pos2.roomName
    },
    adjacent:function(object,subject, distance = 1){
        if (!object || !subject) return false;
        return object.pos.inRangeTo(subject,distance);
    },
    AdjacentPos:function(pos1,posArr,distance = 1){
        for (var pos2 of posArr){
            if (this.adjacentPos(pos1,pos2,distance)) return true
        }
        return false
    },
    /**
     * Broad Adjacent, adjacent judgement from one to any.
     * Subject should have 'pos' property, otherwise return ERR_INVALID_TARGET;
     * Object will be ignored if is undefined, null or do not has 'pos' property.
     * @param   {Number}    range   Range which is used to identify 'adjacent'.
     * @param   {Object}    subject subject of adjacent judgements.
     * @param   {...Object} objects objects which are used to test whether the subject is adjacent to them.
     * @returns {Object|undefined}   object or undefined, indicating the first subject is adjacent to.
     */
    Adjacent:function(subject,objects,range = 1) {
        if (!subject.pos)   return ERR_INVALID_TARGET;
        for (const object of objects) {
            if (!object)     continue;
            if (!object.pos) continue;
            if (subject.pos.inRangeTo(object,range)) return object;
        }
        return undefined;
    },
    getCacheExpiration:function(cache_timeout = CACHE_TIMEOUT,cache_offset = CACHE_OFFSET){
        return cache_timeout + Math.round((Math.random()*cache_offset*2)-cache_offset);
    },
    /**
     * Get the fingerprint for task.
     * @param   {Object} args The arguments of the task.
     * @returns {String} Computed fingerprint based on MD5.
     */
    getTaskFingerprint(args){
        let str = "";
        for (const key in args) {
            // Get the argument and check for validity.
            let arg = args[key];
            if (arg === undefined || arg === null) continue;

            // Exclude not-determining factor.
            if (typeof(arg) === "object"){
                if (arg['amount']){
                    arg = _copy(arg);
                    delete arg["amount"];
                }
            }

            // Add to the str.
            str = str + JSON.stringify(arg);
        }
        // Strip useless symbols in order to reduce computation time.
        str = _strip(str);

        // Return Cache or Add to Cache and return.
        if (_fingerprintCached[str]) return _fingerprintCached[str];
        else return _fingerprintCached[str] = _getHash(str);
    },
    _getComponentRatio:function(componentsObj){
        var totalCost = 0
        for (var component in componentsObj){
            totalCost += componentsObj[component] * BODYPART_COST[component]
        }
        var result = {}
        for (var component in componentsObj){
            result[component] = componentsObj[component] * BODYPART_COST[component] / totalCost
        }
        return result
    },
    getComponentsList:function(roomName,role,groupType,availableEnergy,componentsObj){
        var _componentsObj = JSON.parse(JSON.stringify(componentsObj))
        if (Game.rooms[roomName].energys.length < 2 && role === "upgrader"){
            for (var component in _componentsObj) _componentsObj[component] = Math.ceil(_componentsObj[component] * 0.5);
        }
        if (Game.rooms[roomName].controller.level === 8 && role === "upgrader") {
            for (var component in _componentsObj) _componentsObj[component] = 1;
        }
        const nearCentral = ["W23N25"]
        if (role === "harvester" && groupType === "remoteHarvest"){
            if (nearCentral.indexOf(roomName) < 0){
                _componentsObj["work"] += 10
                _componentsObj["carry"] += 1
                _componentsObj["move"] += 5
            }
        }
        if (role === "transferer" && groupType === "remoteHarvest"){
            if (nearCentral.indexOf(roomName) >= 0){
                for (var component in _componentsObj) _componentsObj[component] = Math.floor(_componentsObj[component] * 0.5);
            }
        }
        if (role === "transferer" && (groupType === "powerHarvest" || groupType === "remoteTransfer" || groupType === "remotePickUper")){
            for (var component in _componentsObj) _componentsObj[component] = _componentsObj[component] * 2;
        }
        const energyDisCom = this._getComponentRatio(_componentsObj)
        var result = []
        for (var component in _componentsObj){
            var times = Math.min(Math.max(Math.floor(availableEnergy * energyDisCom[component] / BODYPART_COST[component]),1),_componentsObj[component])
            for (var i = 0; i < times; i++) result.push(component)
        }
        return result
    },
    getClosetSuitableRoom:function(roomName,controllerLevel,haveStorage = false,binary_energy = false,protected_rooms = []){
        const specific_room_pair = {
            "W22N24":"W21N24"
        }
        var homes = _.filter(global.rooms.my,(r)=>Game.rooms[r].controller.level >= controllerLevel && protected_rooms.indexOf(r) < 0);
        if (haveStorage) homes = _.filter(homes,(h)=>Game.rooms[h].storage)
        if (binary_energy) homes = _.filter(homes,(h)=>Game.rooms[h].energys.length == 2)
        var minDistance = Math.min(...(homes.map((_roomName)=>Game.map.getRoomLinearDistance(roomName,_roomName))));
        homes = _.filter(homes,(_roomName)=>Game.map.getRoomLinearDistance(roomName,_roomName) === minDistance);
        if (homes.indexOf(specific_room_pair[roomName]) >= 0) return specific_room_pair[roomName];
        if (homes.length > 1 && minDistance === 1){
            var adjacentRooms = Game.map.describeExits(roomName);
            for (var index in adjacentRooms){
                var home = adjacentRooms[index];
                if (homes.indexOf(home) >= 0) return home;
            }
        }
        return homes[0]
    },
    analyseCreep:function(creep,analysis = false,simplified_version = false){
        if (simplified_version) {
            if (creep.getActiveBodyparts(ATTACK) || creep.getActiveBodyparts(RANGED_ATTACK)) return "attacker"
            if (creep.getActiveBodyparts(HEAL)) return "healer"
            for (var body of creep.body){
                if (body.type === "heal" || body.type === "attack" || body.type === "ranged_attack") return "disabled";
            }
            return "harmless"
        }
        var bodyAnalysis = {}
        var hits = 0
        const bodyNum = creep.body.length
        for (var body of creep.body){
            if (!bodyAnalysis[body.type]) bodyAnalysis[body.type] = [0,0,false,0,[]]
            bodyAnalysis[body.type][0]++;
            bodyAnalysis[body.type][3] += body.hits
            hits += body.hits
            if(body.boost) bodyAnalysis[body.type][4].push(body.boost)
        }
        for (var body in bodyAnalysis){
            bodyAnalysis[body][1] = Math.floor(bodyAnalysis[body][3] / 100)
            if (bodyAnalysis[body][1] < bodyAnalysis[body][0]) bodyAnalysis[body][2] = true
        }
        if (!analysis) return  bodyAnalysis
        
        var damageSituatioin = ""
        var role = ""
        var hitsRatio = hits / (bodyNum * 100)
        if (hitsRatio >= 0.9) damageSituatioin = "health"
        else if (hitsRatio >= 0.8) damageSituatioin = "normal"
        else if (hitsRatio >= 0.6) damageSituatioin = "damaged"
        else if (hitsRatio >= 0.3) damageSituatioin = "weak"
        else damageSituatioin = "severe"
        if (bodyAnalysis["attack"] || bodyAnalysis["ranged_attack"]) role = "attacker"
        else if (bodyAnalysis["heal"]) role = "healer"
        else if (!bodyAnalysis["attack"] && !bodyAnalysis["ranged_attack"] && !bodyAnalysis["heal"]) role = "harmless"
        else{
            var attackNum = 0, rangedAttackNum = 0,healNum = 0;
            if (bodyAnalysis["attack"]) attackNum = bodyAnalysis["attack"][0]
            if (bodyAnalysis["ranged_attack"]) attackNum = bodyAnalysis["ranged_attack"][0]
            if (bodyAnalysis["heal"]) attackNum = bodyAnalysis["heal"][0]
            if (attackNum + rangedAttackNum - healNum >= 0.2 * bodyNum){
                if (attackNum - rangedAttackNum >= 0.1 * bodyNum) role = "advancedAttacker"
                else if (rangedAttackNum - attackNum >= 0.1 * bodyNum) role = "advancedArcher"
                else role = "King"
            }else role = "advancedHealer"
        }
        return [role,damageSituatioin]
    },
    getCreepsRange:function(creepArr){
        var result = []
        for (var i = 0; i < creepArr.length; i++){
            var distance = 0
            for (var j = 0; j < creepArr.length;j++){
                if (i !== j) distance+=creepArr[i].pos.getRangeTo(creepArr[j])
            }
            result.push(distance / (creepArr.length - 1));
        }
        return result
    },
    roomNameToXY:function(name) {
        let xx = parseInt(name.substr(1), 10);
        let verticalPos = 2;
        if (xx >= 100) {
            verticalPos = 4;
        } else if (xx >= 10) {
            verticalPos = 3;
        }
        let yy = parseInt(name.substr(verticalPos + 1), 10);
        let horizontalDir = name.charAt(0);
        let verticalDir = name.charAt(verticalPos);
        if (horizontalDir === 'W' || horizontalDir === 'w') {
            xx = -xx - 1;
        }
        if (verticalDir === 'N' || verticalDir === 'n') {
            yy = -yy - 1;
        }
        return [xx, yy];
    },
    calcRoomsDistance : function(room1, room2, continuous) {
        var [x1,y1] = this.roomNameToXY(room1);
        var [x2,y2] = this.roomNameToXY(room2);
        var dx = Math.abs(x2-x1);
        var dy = Math.abs(y2-y1);
        if(continuous) {
            var worldSize = Game.map.getWorldSize();
            dx = Math.min(worldSize - dx, dx);
            dy = Math.min(worldSize - dy, dy);
        }
        return dx + dy;
    },
    canGetObjectById:function(targetID,targetPos){
        try {
            if (!targetPos) return "unsure";
            if (!Game.rooms[targetPos.roomName]) return "unsure";
        } catch (error) {
            return false
        }
        if (Game.getObjectById(targetID)) return true
        else return false
    },
    analyseTaskList:function(taskList, _default = undefined){
        if (taskList.charAt(0) === '-' || taskList.charAt(0) === '*') taskList = taskList.slice(1)
        var _taskList = taskList.split('-')
        if (_taskList[1]) _taskList[1] = _taskList[1].split('|')
        else _taskList[1] = _default
        return _taskList
    },
    ownRoom:function(roomName){
        var coordi = this.roomNameToXY(roomName)
        if (!Game.rooms[roomName]) return "unsure"
        if (!Game.rooms[roomName].controller && (coordi[0] % 10 + 1 === 0 || coordi[1] % 10 + 1 === 0)) return "highway"
        if (!Game.rooms[roomName].controller) return "central"
        if (Game.rooms[roomName].controller.my) return true
        if (Game.rooms[roomName].controller.reservation && Game.rooms[roomName].controller.reservation.username === constants.username) return "reserved"
        if (Game.rooms[roomName].controller.owner && Game.rooms[roomName].controller.owner.username !== constants.username) return false
        return "neutral"
    },
    divideRoomList:function(roomName){
        if (roomName.indexOf(',') >= 0) return roomName.split(",")
        else if (roomName.charAt(0) == "W" || roomName.charAt(0) == "w" ||
                 roomName.charAt(0) == "E" || roomName.charAt(0) == "e") return [roomName]
        return undefined
    },
    getAcceptableCoolTime:function(home,targetRoom){
        var dist = this.calcRoomsDistance(home,targetRoom)
        return Math.ceil(acceptableDepositCooldownTime / dist)
    },
    isRolePrimary:function(groupType,role){
        if (role == Object.keys(creepConfig.groupAcceptedTask[groupType])[0]) return true
        else return Object.keys(creepConfig.groupAcceptedTask[groupType])[0]
    },
    getSaltList:function(roomName,_groupType,_groupName,_role){
            SaltListExpiration = Game.time;
            SaltList[roomName] = {}
            var spawningCreepSalts = {}
            for (var spawnTask of Game.rooms[roomName].searchTask("_spawn","default")) {
                const taskInfo = Game.rooms[roomName].taskInfo(spawnTask)
                const groupType = taskInfo.data.memory.group.type
                const groupName = taskInfo.data.memory.group.name
                const role = taskInfo.data.memory.role
                if (!spawningCreepSalts[groupType]) spawningCreepSalts[groupType] = {}
                if (!spawningCreepSalts[groupType][groupName]) spawningCreepSalts[groupType][groupName] = {}
                if (!spawningCreepSalts[groupType][groupName][role]) spawningCreepSalts[groupType][groupName][role] = []
                spawningCreepSalts[groupType][groupName][role].push(taskInfo.data.memory.salt)
            }

            var liveCreepSalts = {}
            const groupTypes = Object.keys(creepConfig.groupAcceptedTask)
            for (var groupType of groupTypes){
                liveCreepSalts[groupType] = {}
                for (var groupName in Game.rooms[roomName][groupType]){
                    liveCreepSalts[groupType][groupName] = {}
                    for (var role in Game.rooms[roomName][groupType][groupName]) liveCreepSalts[groupType][groupName][role] = _.map(Game.rooms[roomName][groupType][groupName][role],(c)=>c.memory.salt)
                }
            }

            for (var groupType of groupTypes){
                SaltList[roomName][groupType] = {};
                for (var groupName in liveCreepSalts[groupType]){
                    SaltList[roomName][groupType][groupName] = {};
                    for (var role in liveCreepSalts[groupType][groupName]){
                        SaltList[roomName][groupType][groupName][role] = liveCreepSalts[groupType][groupName][role]
                    }
                }
                for (var groupName in spawningCreepSalts[groupType]){
                    if (!SaltList[roomName][groupType][groupName]) SaltList[roomName][groupType][groupName] = {};
                    for (var role in spawningCreepSalts[groupType][groupName]){
                        if (!SaltList[roomName][groupType][groupName][role]) SaltList[roomName][groupType][groupName][role] = []
                        SaltList[roomName][groupType][groupName][role] = SaltList[roomName][groupType][groupName][role].concat(spawningCreepSalts[groupType][groupName][role])
                    }
                }   
            }
        try {return SaltList[roomName][_groupType][_groupName][_role] || []} catch (error) {return []}
    },
    getBoosts:function(role,groupType){
        if (!creepConfig.boosts[role]) return []
        return creepConfig.boosts[role][groupType] || []
    },
    getLabTarget:function(roomName,mode){
        const resourceTypes = labConfig[roomName][mode]
        let resourceType = undefined
        if (mode !== "focus"){
            if (!Game.rooms[roomName].memory.labCur) Game.rooms[roomName].memory.labCur = {};
            if (!Game.rooms[roomName].memory.labCur.expirationTime) Game.rooms[roomName].memory.labCur.expirationTime = {};
            if (resourceTypes.length > 0) {
                if (!Game.rooms[roomName].memory.labCur[mode]) Game.rooms[roomName].memory.labCur[mode] = 0;
                //if (!Game.rooms[roomName].memory.labCur.expirationTime[mode]) Game.rooms[roomName].memory.labCur.expirationTime[mode] = Game.time + this.getCacheExpiration(labConfig.mostReactionTime,50);
                //if (Game.rooms[roomName].memory.labCur.expirationTime[mode] <= Game.time) {
                //    Game.rooms[roomName].memory.labCur[mode] = (Game.rooms[roomName].memory.labCur[mode] + 1) % resourceTypes.length;
                //    Game.rooms[roomName].memory.labCur.expirationTime[mode] = Game.time + this.getCacheExpiration(labConfig.mostReactionTime,50);
                //}
                resourceType = resourceTypes[Game.rooms[roomName].memory.labCur[mode] % resourceTypes.length];
                if (mode === "default" && global.resources[roomName][resourceType] && global.resources[roomName][resourceType]["labs"] >= labConfig.mostExistenceAmount){
                    if (Game.rooms[roomName].memory.labCur[mode] === ((Game.rooms[roomName].memory.labCur[mode] + 1) % resourceTypes.length)) return undefined;
                    Game.rooms[roomName].memory.labCur[mode] = (Game.rooms[roomName].memory.labCur[mode] + 1) % resourceTypes.length;
                    resourceType = resourceTypes[Game.rooms[roomName].memory.labCur[mode] % resourceTypes.length];
                }
            }else Game.rooms[roomName].memory.labCur[mode] = 0;
        }else resourceType = resourceTypes
        return resourceType
    },
    getSuitableRoute:function(fromRoom,toRoom){
        return [];
    },
    getAllCreeps:function(roomName){
        creepsCollection[roomName] = _.groupBy(Game.rooms[roomName].creeps,(c)=>c.memory.role);
        for (var role in creepConfig.components) if (!creepsCollection[roomName][role]) creepsCollection[roomName][role] = [];
        for (var _creepTask of Game.rooms[roomName].searchTask("_spawn","default")) {
            const taskInfo = Game.rooms[roomName].taskInfo(_creepTask)
            const simulateCreep = {memory:taskInfo.data.memory}
            creepsCollection[roomName][taskInfo.data.memory.role].push(simulateCreep);
        }
        return creepsCollection[roomName]
    },
    /**
     * Check for the validity of target.
     * @param {String} targetId The Id of the target.
     * @param {Object} targetPos The pos of the target, expecting has x,y,roomName.
     * @returns {String|Boolean|undefined} true, false. Or, "unsure" for lacking sight. Or, undefined for invalid targetPos.
     */
    checkTargetValidity(targetId,targetPos) {
        if (!targetPos) return undefined;
        if (!Game.rooms[targetPos.roomName]) return "unsure";
        if (Game.getObjectById(targetId)) return true;
        return false;
    },
    /**
     * Get a fake position from RoomPosition Object, which only has "x","y","roomName" properties.
     * @param   {Object} pos RoomPosition Object or at least has x,y,roomName.
     * @returns {Object} Fake Position, having x,y,roomName.
     */
    getPos(pos) {
        const fakePos = {
            x       :pos.x,
            y       :pos.y,
            roomName:pos.roomName,
        };
        return fakePos;
    },
    /**
     * Check for storing.
     * @param {Object} target Target
     * @param {String|undefined} resourceType resourceType
     * @param {Number|String|undefined} amount Amount
     * @returns {Boolean} true | false
     */
    checkForStore(target,resourceType,amount) {
        const storingAmount = resourceType? target.store.getUsedCapacity(resourceType) : (target.store.getUsedCapacity() || target.store.getUsedCapacity(RESOURCE_ENERGY));
        if (typeof(amount) !== "number") amount = 0;
        return storingAmount > amount;
    },
}
module.exports = utilsCollection