const CACHE_TIMEOUT = 50;
const CACHE_OFFSET  = 4;
const SHA1 = require('fingerprint.Algorithm.sha1')
const utilsCollection = {
    dis:function(_object_1_id,_object_2_id){
        const _object_1 = Game.getObjectById(_object_1_id)
        const _object_2 = Game.getObjectById(_object_2_id)
        let x_diff = Math.abs(_object_1.pos.x - _object_2.pos.x)
        let y_diff = Math.abs(_object_1.pos.y - _object_2.pos.y)
        return [x_diff,y_diff]
    },
    adjacent:function(_object_1_id,_object_2_id,distance = 1){
        const dist = this.dis(_object_1_id,_object_2_id)
        return dist[0] <= distance && dist[1] <= distance
    },
    Adjacent:function(_object_1_id,_arr_id,distance = 1){
        for (var _object_2_id of _arr_id){
            if (this.adjacent(_object_1_id,_object_2_id)) return true
        }
        return false
    },
    getCacheExpiration:function(cache_timeout = CACHE_TIMEOUT,cache_offset = CACHE_OFFSET){
        return cache_timeout + Math.round((Math.random()*cache_offset*2)-cache_offset);
    },
    getTaskFingerprint:function(args){
        var hash = SHA1.create()
        for (var arg in args) hash.update(arg.toString())
        return hash.digest()
    }
}
module.exports = utilsCollection