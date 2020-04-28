var resourcePrice = {}
const constants = require('constants')
const marketExtension = {
    perUnitCost(amount,price,home,targetRoom,orderType){
        var _perUnitCostFactor = -1
        if (orderType === ORDER_SELL) _perUnitCostFactor = 1
        return (amount * price + this.getTransactionFee(home,targetRoom,amount) * _perUnitCostFactor) / amount
    },
    logOrders(orderArray,home,displayCnt = 10){
        var cnt = 0
        for (var order of orderArray){
            console.log(order.id,constants.emoji.number,order.amount,constants.emoji.money,this.perUnitCost(order.amount,order.price,home,order.roomName,order.type),constants.emoji.face,order.roomName);
            cnt++;
            if (cnt >= displayCnt) break
        }
    },
    getTransactionFee(home,targetRoom,amount){
        var energyCost = this.calcTransactionCost(amount,home,targetRoom)
        var energyPrice = this.getAvgPrice(RESOURCE_ENERGY)
        return energyCost * energyPrice
    },
    getAvgPrice(resourceType){
        if (resourcePrice[resourceType] === undefined){
            var history = this.getHistory(resourceType)
            if (history.length > 0) return resourcePrice[resourceType] = history[0]["avgPrice"]
            else return resourcePrice[resourceType] = null
        }else return resourcePrice[resourceType]
    },
    getOptimisticDeals(orderType,resourceType,home){
        var availableOrders = this.getAllOrders({type:orderType,resourceType:resourceType})
        availableOrders = _.filter(availableOrders,(o)=>o.amount !== 0 && o.price !== null)
        if (orderType === ORDER_BUY){
            const buyCmp = (orderA,orderB)=>this.perUnitCost(orderB.amount,orderB.price,home,orderB.roomName,orderType)-this.perUnitCost(orderA.amount,orderA.price,home,orderA.roomName,orderType)
            availableOrders.sort(buyCmp)
        }else if (orderType === ORDER_SELL){
            const sellCmp = (orderA,orderB)=>this.perUnitCost(orderA.amount,orderA.price,home,orderA.roomName,orderType)-this.perUnitCost(orderB.amount,orderB.price,home,orderB.roomName,orderType)
            availableOrders.sort(sellCmp)
        }
        return availableOrders
    },
    logOptimisticDeals(orderType,resourceType,home){
        this.logOrders(this.getOptimisticDeals(orderType,resourceType,home),home)
    }
}
module.exports = marketExtension