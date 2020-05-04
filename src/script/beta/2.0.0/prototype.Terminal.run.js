const that = require('prototype.Market.run').marketExtension
const configTerminal = require('configuration.Terminal')
const ERR_COOLDOWN = 1
const ERR_NO_AVAILABLE_DEAL = 2
const inBound = function (x,lower_bound,upper_bound){
    return x >= lower_bound && x <= upper_bound
}
const randomPrice = function (lower_bound,uppper_bound){
    return lower_bound + Math.random() * (uppper_bound - lower_bound);
}
const terminalExtensions = {
    dealOptimisticResources(orderType,resourceType,amount,settings = {basePrice:undefined,onlyDeal:true}){
        if (this.cooldown > 0) return ERR_COOLDOWN
        if (settings.onlyDeal === undefined || settings.onlyDeal === null) settings.onlyDeal = true

        var createOrderType = null
        if (orderType === ORDER_SELL) createOrderType = ORDER_BUY;
        if (orderType === ORDER_BUY) createOrderType = ORDER_SELL;

        var optimisticDeal = that.getOptimisticDeals(orderType,resourceType,this.room.name)[0]
        if (!optimisticDeal) return ERR_NO_AVAILABLE_DEAL
        if (settings.basePrice){
            if (optimisticDeal.type === "sell" && optimisticDeal.price > settings.basePrice) return ERR_NO_AVAILABLE_DEAL
            if (optimisticDeal.type === "buy" && optimisticDeal.price < settings.basePrice) return ERR_NO_AVAILABLE_DEAL
        }
        var marketCondition = that.getPriceBound(resourceType)
        var existingOrder = that.getMyOrder(createOrderType,resourceType)
        if (inBound(optimisticDeal.price,marketCondition[0],marketCondition[1]) || (orderType === ORDER_SELL && optimisticDeal.price <= marketCondition[0]) || (orderType === ORDER_BUY && optimisticDeal.price >= marketCondition[1])) {
            var maximumDealAmount = Math.min(that.getOptimisticDealAmount(optimisticDeal.id,this.room.name,amount),this.store.getFreeCapacity())
            if (maximumDealAmount === 0) return ERR_NO_AVAILABLE_DEAL
            if (existingOrder) {
                var order = Game.market.getOrderById(existingOrder)
                if (order.remainingAmount >= amount - maximumDealAmount) Game.market.cancelOrder(existingOrder)
            }
            var _feedback = Game.market.deal(optimisticDeal.id,maximumDealAmount,this.room.name)
            if (_feedback === 0) console.log(this.room.name,"Deal",resourceType,orderType,maximumDealAmount);
            return _feedback
        }else if (!settings.onlyDeal){
            if (existingOrder) {
                var order = Game.market.getOrderById(existingOrder)
                if (!inBound(order.price,marketCondition[0],marketCondition[1])) Game.market.changeOrderPrice(existingOrder,randomPrice(marketCondition[0],marketCondition[1]));
                if (order.remainingAmount < amount) Game.market.extendOrder(order.id,amount - order.remainingAmount);
            }else Game.market.createOrder(createOrderType,resourceType,randomPrice(marketCondition[0],marketCondition[1]),amount,this.room.name);
        }
    },
    distributeMineral(){
        if (this.cooldown > 0) return ERR_COOLDOWN
        if (this.store[this.room.mineral.mineralType] < configTerminal.mineralDistributeMinAmount) return ERR_NOT_ENOUGH_RESOURCES
        var neededRooms = _.filter(global.rooms.my,(r)=>Game.rooms[r].terminal && 
                                                        Game.rooms[r].mineral.mineralType !== this.room.mineral.mineralType &&
                                                        Game.rooms[r].terminal.store[this.room.mineral.mineralType] < configTerminal.mineralDistributeMinAmount)
        var targetRoom = neededRooms[0]
        if (!targetRoom) return ERR_FULL
        return this.send(this.room.mineral.mineralType,configTerminal.mineralDistributeMinAmount,targetRoom,`Distribute ${this.room.mineral.mineralType} to ${targetRoom} from ${this.room.name}`)
    }
}
_.assign(StructureTerminal.prototype,terminalExtensions)