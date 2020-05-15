/**
 * Collection of useful functions.
 * @module utils
 */

const MD5                   =   require('fingerprint.Algorithm.md5');
const _fingerprintCached    =   {};

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

/**
 * Collection of useful functions.
 * @export utils
 */
const utilsCollections = module.exports = {
    /**
     * Return the state of the room.
     * @param   {String} roomName The name of the target Room.
     * @returns {String} "unsure" | "occupied" | "my" | "reserved" | "highway" | "central" | "neutral"
     */
    roomState(roomName) {
        let parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
        if (parsed[1] % 10 === 0 || parsed[2] % 10 === 0) return "highway";
        
        let room = Game.rooms[roomName];
        if (!room)  return "unsure";

        let controller = room.controller;
        if (!controller) return "central";

        if (controller.my) return "my";
        if (controller.owner.username) return "occupied";

        let reservation = controller.reservation;
        if (reservation.username === global.username) return "reserved";
        if (reservation.username) return "occupied";

        return "neutral";
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
    Adjacent(range = 1,subject,...objects) {
        if (!subject.pos)   return ERR_INVALID_TARGET;
        for (const object of objects) {
            if (!object)     continue;
            if (!object.pos) continue;
            if (subject.pos.inRangeTo(object,range)) return object;
        }
        return undefined;
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
        else return _fingerprintCached[str] = MD5(str);
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
}