(function(){
    const ERR_MAX_ITERATION_REACHED = 1;
    const ERR_NO_DATA = 2;
    const BASIC_RESOURCES = [RESOURCE_ENERGY,   RESOURCE_KEANIUM,   RESOURCE_HYDROGEN,  RESOURCE_OXYGEN,
                             RESOURCE_CATALYST, RESOURCE_ZYNTHIUM,  RESOURCE_UTRIUM,    RESOURCE_LEMERGIUM,
                             RESOURCE_GHODIUM,]
    const COMPRESSED_RESOURCES = [RESOURCE_BATTERY,   RESOURCE_KEANIUM_BAR,   RESOURCE_REDUCTANT,     RESOURCE_OXIDANT, 
                                RESOURCE_PURIFIER,  RESOURCE_ZYNTHIUM_BAR,  RESOURCE_UTRIUM_BAR,    RESOURCE_LEMERGIUM_BAR,
                                RESOURCE_GHODIUM_MELT]

    function _getPrice(commodity) {
        var priceHistory = Game.market.getHistory(commodity);
        if (priceHistory.length === 0) return ERR_NO_DATA;
        return priceHistory[priceHistory.length - 1]["avgPrice"];
    }
    /*
    @@ commodity: target commodity.
    @@ settings::amount: the amount of commodity.
    @@ settings::stopArr: the result will be shown based on these resources and basic resources.
    @@ settings::maxIteration: maximum calculation iterations.
    */
    function calcCommodityRawComponents(commodity,settings = {amount:1,stopArr:[],maxIteration:1024,}) {
        _.defaults(settings,{
            amount:1,
            stopArr:[],
            maxIteration:1024,
        });
        if (!commodity || !COMMODITIES[commodity] || 
            !Number.isInteger(settings.amount) || settings.amount <= 0 || 
            !Array.isArray(settings.stopArr) || 
            !Number.isInteger(settings.maxIteration) || settings.maxIteration <= 0) return ERR_INVALID_ARGS;
        for (var i = 0; i < COMPRESSED_RESOURCES.length; i++) if (settings.stopArr.indexOf(COMPRESSED_RESOURCES[i]) === -1) settings.stopArr.push(BASIC_RESOURCES[i]);

        var queue = [[commodity,settings.amount]];
        var ret = {cooldown:0,components:{}};
        var cnt = 1;
        var addToRet = (type,amount) => ret.components[type] = ret.components[type]? ret.components[type] + amount:amount;
        var addCooldown = (cooldown) => ret.cooldown += cooldown;
        while (queue.length && cnt <= settings.maxIteration) {
            cnt++;
            var front = queue.shift();
            var type = front[0], amount = front[1];
            if (settings.stopArr.indexOf(type) >= 0 || !COMMODITIES[type]) {
                addToRet(type,amount);
                continue;
            }
            addCooldown(COMMODITIES[type].cooldown);
            for (var _type in COMMODITIES[type].components) {
                var amountRatio = COMMODITIES[type].components[_type].amount / COMMODITIES[type].amount;
                queue.push([_type,amountRatio * amount]);
            }
        }
        if (cnt > settings.maxIteration) return ERR_MAX_ITERATION_REACHED;
        return ret;
    }
    /*
    @@ commodity: target commodity.
    @@ settings::amount: the amount of commodity.
    @@ settings::stopInfo: Array of [resourceType,amount], meaning these resources are available and will not be calculated.
    @@ settings::maxIteration: maximum calculation iterations.
    returns will based on 0: basic resourceType; 1: compressed resources; 2: mixed.
    */
    function calcCommodityComponents(commodity,settings = {amount:1,stopInfo:[],maxIteration:1024,returnBasis:0}) {
        _.defaults(settings,{
            amount:1,
            stopInfo:[],
            maxIteration:1024,
            returnBasis:0
        });
        var ret = undefined;
        try{
            const stopArr = _.map(stopInfo,(i)=>i[0]);
            ret = calcCommodityRawComponents(commodity,{amount,stopArr,maxIteration});
            if (!_.isObject(ret)) return ret;
        }catch(error){return ERR_INVALID_ARGS;}
        var additionCalc = [];
        for (var info of settings.stopInfo) {
            try{
                const type = info[0];
                const existingAmount = info[1];
                if (type in ret.components) {
                    if (ret.components[type] > existingAmount) additionCalc.push([type,ret.components[type] - existingAmount])
                    delete ret.components[type];
                }
            }catch (error){return ERR_INVALID_ARGS;}
        }
        var basedResources = []
        if (settings.returnBasis === 0) basedResources = [].concat(BASIC_RESOURCES);
        else if (settings.returnBasis === 1) basedResources = [].concat(COMPRESSED_RESOURCES);
        else if (settings.returnBasis === 2) basedResources = [].concat(BASIC_RESOURCES,COMPRESSED_RESOURCES);
        else return ERR_INVALID_ARGS;
        var additionCost = _.map(additionCalc,(arr)=>calcCommodityRawComponents(arr[0],{amount:arr[1],stopArr:basedResources}));
        return _.merge(ret,additionCost);
    }
    /*
    @@ commodity: target commodity.
    @@ settings::amount: the amount of commodity.
    @@ settings::stopArr: the result will be shown based on these resources and basic resources.
    @@ settings::ignoreNoData: whether ignores potential no-data resources.
    */
    function calcExpectedRevenue(commodity,settings = {amount:1,stopArr:[],ignoreNoData:true}) {
        _.defaults(settings,{
            amount:1,
            stopArr:[],
            ignoreNoData:true});
        if (_getPrice(commodity) === ERR_NO_DATA) return ERR_NO_DATA;
        var basis = calcCommodityRawComponents(components,{amount,stopArr});
        if (!_.object(basis)) return basis;
        var cost = 0;
        for (var component in basis.components) {
            var price = _getPrice(component);
            if (price !== ERR_NO_DATA) cost += price * basis.components[component];
            else if (!settings.ignoreNoData) return ERR_NO_DATA;
        }
        return _getPrice(commodity) - cost;
    }
    /*
    @@ commodity: target commodity.
    @@ settings::amount: the amount of commodity.
    @@ settings::roomName: based-roomName, array or string. all, if length === 0.
    @@ settings::storeObjects: objects storing resources, array or object.
    Notice that this function will calculated based on Storage, and Terminal by default.
    */
    function calcCommodityComponentsBasedOnExistence(commodity,settings = {amount:1,roomName:[],storeObjects:[]}){
        _.defaults(settings,{
            amount:1,
            roomName:[],
            storeObjects:[],
        });
        if (settings.roomName === undefined || settings.roomName === null) settings.roomName = [];
        if (!Array.isArray(settings.roomName)) settings.roomName = [settings.roomName];
        if (!Array.isArray(settings.storeObjects)) settings.storeObjects = [settings.storeObjects];
        var existingComponents = [];
        var existingAmount = [];
        var addToList = function (type,amount) {
            var pos = existingComponents.indexOf(type);
            if (pos >= 0) existingAmount[pos] += amount;
            else {
                existingComponents.push(type);
                existingAmount.push(amount);
            }
        }
        var addToListByObject =  function (object) {for (var carry in object.store) addToList(carry,object.store[carry]);}
        var addToListByRoom = function (roomName) {
            if (Game.rooms[roomName].storage) addToListByObject(Game.rooms[roomName].storage);
            if (Game.rooms[roomName].terminal) addToListByObject(Game.rooms[roomName].terminal);
        }
        if (settings.roomName.length > 0) {
            for (var roomName of settings.roomName) {
                if (Game.rooms[roomName]) addToListByRoom(roomName);
                else return ERR_INVALID_ARGS;
            }
        }else {for (var roomName in Game.rooms) addToListByRoom(roomName);}

        for (var storeObject of settings.storeObjects){
            if (storeObject && storeObject.store) addToListByObject(storeObject);
            else return ERR_INVALID_ARGS;
        }
        var existingInfo = [];
        for (var i = 0; i < existingComponents.length; i++) existingInfo.push([existingComponents[i],existingAmount[i]]);
        return calcCommodityComponents(commodity,{amount:amount,existingInfo});
    }
    function createMethod() {
        var methods = {};
        methods.commodity = {
            "calcExpectedRevenue":calcExpectedRevenue,
            "calcRawComponents":calcCommodityRawComponents,
            "calcComponents":calcCommodityComponents,
            "calcComponentsByExistence":calcCommodityComponentsBasedOnExistence,
        };
        return methods;
    }
    module.exports = createMethod();
})();