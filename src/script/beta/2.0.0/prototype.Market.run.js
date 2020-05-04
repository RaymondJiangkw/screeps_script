var resourcePrice = {}
const constants = require('constants')
const marketExtension = {
    perUnitCost(amount,price,home,targetRoom,orderType){
        if (orderType === ORDER_SELL) return (amount * price + this.getTransactionFee(home,targetRoom,amount)) / amount;
        else if (orderType === ORDER_BUY) return (amount * price - this.getTransactionFee(home,targetRoom,amount)) / amount;
    },
    getTransactionFee(home,targetRoom,amount){
        var energyCost = Game.market.calcTransactionCost(amount,home,targetRoom)
        var energyPrice = this.getPrice(RESOURCE_ENERGY)[0]
        return energyCost * energyPrice
    },
    getPrice(resourceType){
        if (resourcePrice[resourceType] === undefined){
            var history = Game.market.getHistory(resourceType)
            if (history.length > 0) return resourcePrice[resourceType] = [history[history.length - 1]["avgPrice"],history[history.length - 1]["stddevPrice"]]
            else return resourcePrice[resourceType] = [null,null]
        }else return resourcePrice[resourceType]
    },
    getPriceBound(resourceType){
        var marketPrice = this.getPrice(resourceType)
        return [marketPrice[0] - marketPrice[1],marketPrice[0] + marketPrice[1]]
    },
    getOptimisticDeals(orderType,resourceType,home){
        var availableOrders = Game.market.getAllOrders({type:orderType,resourceType:resourceType})
        availableOrders = _.filter(availableOrders,(o)=>o.amount !== 0 && o.price !== null)
        availableOrders = _.filter(availableOrders,(o)=>global.rooms.my.indexOf(o.roomName) < 0)
        if (orderType === ORDER_BUY){
            const buyCmp = (orderA,orderB)=>this.perUnitCost(orderB.amount,orderB.price,home,orderB.roomName,orderType)-this.perUnitCost(orderA.amount,orderA.price,home,orderA.roomName,orderType)
            availableOrders.sort(buyCmp)
        }else if (orderType === ORDER_SELL){
            const sellCmp = (orderA,orderB)=>this.perUnitCost(orderA.amount,orderA.price,home,orderA.roomName,orderType)-this.perUnitCost(orderB.amount,orderB.price,home,orderB.roomName,orderType)
            availableOrders.sort(sellCmp)
        }
        return availableOrders
    },
    getMaximumDealAmount(orderId,home){
        if (!Game.rooms[home].terminal) return null
        var order = Game.market.getOrderById(orderId)
        var energyCost = Game.market.calcTransactionCost(1,home,order.roomName)
        var energyStore = Game.rooms[home].terminal.store[RESOURCE_ENERGY]
        return Math.min(order.amount,Math.floor(energyStore / energyCost),Math.floor(Game.market.credits / order.price))
    },
    getOptimisticDealAmount(orderID,home,amount){
        if (!amount) return this.getMaximumDealAmount(orderID,home)
        return Math.min(amount,this.getMaximumDealAmount(orderID,home))
    },
    getMyOrder(orderType,resourceType){
        for (var order in Game.market.orders){
            if (Game.market.orders[order].type === orderType && Game.market.orders[order].resourceType === resourceType){
                if (!Game.market.orders[order].active) Game.market.cancelOrder(order)
                else return order
            }
        }
        return undefined
    }
}
module.exports = {
    marketExtension:marketExtension,
    mount:function(){
        Object.defineProperty(Game.market,"logOrders",{value:function (orderArray,home,displayCnt = 10){
            var cnt = 0
            for (var order of orderArray){
                const perUnitCost = marketExtension.perUnitCost(order.amount,order.price,home,order.roomName,order.type)
                const marketPrice = marketExtension.getPriceBound(order.resourceType)
                var priceEmoji = undefined
                if ((order.price >= marketPrice[1] && order.type === "sell") || (order.price <= marketPrice[0] && order.type === "buy")) priceEmoji = constants.emoji.neutralFace
                else if ((order.price <= marketPrice[0] && order.type === "sell") || (order.price >= marketPrice[1] && order.type === "buy")) priceEmoji = constants.emoji.bigSmile
                else priceEmoji = constants.emoji.slightSmile
                console.log(order.id,constants.emoji.number,marketExtension.getMaximumDealAmount(order.id,home),constants.emoji.money,perUnitCost,priceEmoji,order.roomName);
                cnt++;
                if (cnt >= displayCnt) break;
            }
        }})
        Object.defineProperty(Game.market,"logOptimisticDeals",{value:function(orderType,resourceType,home){
            this.logOrders(marketExtension.getOptimisticDeals(orderType,resourceType,home),home)
        }})
    }
}