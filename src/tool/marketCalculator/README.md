# The tool of Market related to Commodity.

## Catalogue
- [Introduction](#..Introduction)
- [Setup](#..Setup)
- [Example](#..Example)
    - [rawComponent](#..Example.rawComponent)
    - [component](#..Example.component)
    - [revenue](#..Example.revenue)
    - [bestCommodity](#..Example.bestCommodity)
- [API](#..API)

<a name = "..Introduction"></a>
## Introduction
The goal of this tool is to do calculations about commodities to help you make the best decision to get the most credits.

But this tool is useless for some players who dominate some sectors, have countless raw materials and have very high GPL, which make them produce level *5* commodity (always the most profitable) as easy as possible. The only restrictions for them are "Game mechanism". I hope at least this tool can give them some inspirations and I will appreciate it if they can give some advice on this tool to help it and me improve.

Also, this tool may still have bugs and ambiguous parts and can be greatly improved, in effiency and function, which I will be glad if you point out. :)

Notice that
- This tool, currently, only considers items in the Constants `COMMODITIES`.
- This tool treats `ghodium` and `ghodium_melt` like normal minerals, such as `hydrogen` and `reductant`.
- This tool uses <code>_getPrice(commodity)</code> to get the price of commodity in the market. Since the evaluation of value is very complex and differs for different players, it only evaluates the current value of commodity by taking `avgPrice`, but you can modify this function as you like to be more scientific and rational. For example, taking `transactions` and `volume` into account, or get the random price between `avgPrice - stddevPrice` and `avgPrice + stddevPrice`.
- In the [API](#..API) part, all exposed functions have a line of description which estimates their **CPU** cost.
- For those who want to rewrite this tool, every inner method also has documentation written in the form recognizable by `jsdoc`.
- It is ***important*** to check the **Example** before going to the **API**, because I explain many details in the **Example**.

<a name = "..Setup"></a>
## Setup
You can write this in your <code>main.js</code>.
```
require("tool.marketCalculator");
```
<a name = "..Example"></a>
## Example
<a name = "..Example.rawComponent"></a>
### [rawComponent(commodity, [settings])](#marketCalculator..rawComponent)

This function is mainly used for calculating the components to produce the commdity. 

```
// Reduce commodity to very basic resourceTypes.
>>> MarketCal.commodity.rawComponent(RESOURCE_DEVICE);
{
    "cooldown":6233.799999999999, // Total ticks needed to produce.
    "components":{                // Total required raw materials.
        "energy":13269,
        "G":750,
        "O":5895,
        "silicon":5555,
        "X":1050,
        "L":550,
        "K":550,
        "H":5525,
        "U":8515,
        "Z":1000
    },
    "recipes":[                   // The steps to produce this commodity. Every step means that YOU have enough COMPONENTS, transfer them to the FACTORY, and YOU can produce.
        ["zynthium_bar",200],
        ["utrium_bar",1703],
        ["reductant",1105],
        ["keanium_bar",110],
        ["lemergium_bar",110],
        ["purifier",210],
        ["wire",1111],
        ["composite",200],
        ["oxidant",1179],
        ["switch",56],
        ["transistor",13],
        ["ghodium_melt",150],
        ["crystal",110],
        ["microchip",4],
        ["circuit",1],
        ["device",1]
    ]
}

// Calculate how many resources are needed to produce multiply commodity.
>>> MarketCal.commodity.rawComponent(RESOURCE_SWITCH,{amount:2});
{
    "cooldown":48,
    "components":{
        "energy":176,
        "silicon":80,
        "O":190,
        "U":150
    },
    "recipes":[
        ["utrium_bar",30],
        ["oxidant",38],
        ["wire",16],
        ["switch",2]
    ]
}

// What if you want the calculation to stop at some low level commodities rather than very basic resourceTypes to produce high level commodity?
>>> MarketCal.commodity.rawComponent(RESOURCE_DEVICE,{stopArr:[RESOURCE_CIRCUIT]});
{
    "cooldown":3577.6,
    "components":{
        "circuit":1,
        "energy":7741,
        "G":750,
        "silicon":3165,
        "X":925,
        "L":550,
        "K":550,
        "H":2550,
        "U":4755,
        "Z":750,
        "O":2280
    },
    "recipes":[
        ["oxidant",456],
        ["zynthium_bar",150],
        ["utrium_bar",951],
        ["reductant",510],
        ["switch",24],
        ["keanium_bar",110],
        ["lemergium_bar",110],
        ["purifier",185],
        ["wire",633],
        ["composite",150],
        ["transistor",6],
        ["ghodium_melt",150],
        ["crystal",110],
        ["microchip",3],
        ["device",1]
    ]
}
// More details are in the API.
```

<a name = "..Example.component"></a>
### [component(commodity, [settings])](#marketCalculator..component)

This function is mainly for calculating the **additional** components of commodity.

```
// Calculate additional resources are needed to produce specific commodity based on what you have.

//   Suppose you have 100 energy and 500 silicon.
>>> MarketCal.commodity.component(RESOURCE_SWITCH,{amount:2,stopResources:[ [RESOURCE_ENERGY,100], [RESOURCE_SILICON,500] ]});
{
    "components":{
        "O":190,
        "U":150
    },
    "cooldown":48,
    "recipes":[
        ["utrium_bar",30],
        ["oxidant",38],
        ["wire",16],
        ["switch",2]
    ]
}

//   Suppose you have nearly endless energy, utrium and 500 silicon.
>>> MarketCal.commodity.component(RESOURCE_SWITCH,{amount:2,stopResources: [RESOURCE_ENERGY, [RESOURCE_UTRIUM], [RESOURCE_SILICON,500] ]});
{
    "components":{
        "O":190
    },
    "cooldown":48,      // Notice that you still need to produce "utrium_bar" in this case.
    "recipes":[
        ["utrium_bar",30],
        ["oxidant",38],
        ["wire",16],
        ["switch",2]
    ]
}

// But you may plan to buy some level 3 commodity in the market and produce and sell level 5 commodity, how do you know how many level 3 commodities are needed based on what you have to produce level 5 commodity? Remember stopArr ?
>>> MarketCal.commodity.component(RESOURCE_DEVICE,{stopArr:    [RESOURCE_MICROCHIP], stopResources: [RESOURCE_SILICON, RESOURCE_ENERGY]});
{                      // There you go.
    "components":{
        "microchip":4,
        "G":750,
        "O":2855,
        "L":550,
        "K":550,
        "X":550,
        "H":2125,
        "U":2175
    },
    "cooldown":2905,
    "recipes":[        // Notice that "microship" does not appear in the "recipes" but still apear in the "components".
        ["utrium_bar",435],
        ["reductant",425],
        ["wire",267],
        ["purifier",110],
        ["keanium_bar",110],
        ["lemergium_bar",110],
        ["oxidant",571],
        ["switch",24],
        ["transistor",5],
        ["ghodium_melt",150],
        ["crystal",110],
        ["circuit",1],
        ["device",1]
    ]
}

//   Perhaps you want to know how many additional resources are needed to produce this commodity based on the storing objects in your rooms. And you do not want to type them manually.
>>> MarketCal.commodity.component(RESOURCE_DEVICE,{amount:10,existenceBased:true});
{
    "components":{
        "G":6470,
        "O":34665,
        "U":63645,
        "H":9901
    },
    "cooldown":58566,
    "recipes":[
        ["reductant",6050],
        ["purifier",400],
        ["wire",10650],
        ["utrium_bar",13880],
        ["composite",1800],
        ["oxidant",9300],
        ["lemergium_bar",1100],
        ["switch",560],
        ["transistor",130],
        ["ghodium_melt",1500],
        ["crystal",1100],
        ["microchip",40],
        ["circuit",10],
        ["device",10]
    ]
}

//   Perhaps you do not want to count all the rooms you control.
>>> MarketCal.commodity.component(RESOURCE_SWITCH,{amount:1,   existenceBased:true, roomNames:["W22N25","W21N24"]});
{
    "components":{},    // There are no components here, since I have enough silicons, energies and minerals.
    "cooldown":14,
    "recipes":[
        ["switch",1]
    ]
}

// Notice! This function will not detect your storing objects except for storage and terminal in the room by default, unless you cache them to the Room.prototype. But you can turn it on by setting findObjects = true, which will cost additional CPU time.
>>> MarketCal.commodity.component(RESOURCE_DEVICE,{amount:1,existenceBased:true, roomNames:["W22N25","W21N24"], findObjects:true});
{                       // This function will not take factories' levels into account, since its function is to calculate required additional resources to produce the commodity.
    "components":{},
    "cooldown":4712.4,
    "recipes":[
        ["wire",651],
        ["keanium_bar",110],
        ["lemergium_bar",110],
        ["purifier",210],
        ["switch",56],
        ["transistor",13],
        ["ghodium_melt",150],
        ["crystal",110],
        ["microchip",4],
        ["circuit",1],
        ["device",1]
    ]
}

//   If cache structures to the Room.prototype, namely the function can access factory in the room by room.factory. And in this case, this option will be true by default.

// Also you can pass storing objects to this function without letting findObjects = true to save CPU time.
>>> MarketCal.commodity.component(RESOURCE_SWITCH,{amount:5,existenceBased:true, storeObjects: [Game.getObjectById("5ec2447605ada09c3567feb8")]});
{
    "components":{},
    "cooldown":70,
    "recipes":[
        ["switch",5]
    ]
}

// More details are in the API.
```

<a name = "..Example.revenue"></a>
### [revenue(commodity, [settings])](#marketCalculator..revenue)

This function is used to calculate the expected revenues of producing the commodity based on information about resources.

```
// Perhaps you want to know how many credits can be earned by producing level 5 commodity with all the very basic materials bought in the market.
>>> MarketCal.commodity.revenue(RESOURCE_DEVICE);
{
    "revenue":101719.032,
    "cooldown":6233.799999999999,
    "lackingPriceResources":{},
    "buy":{},
    "recipes":[
        ["zynthium_bar",200],
        ["utrium_bar",1703],
        ["reductant",1105],
        ["keanium_bar",110],
        ["lemergium_bar",110],
        ["purifier",210],
        ["wire",1111],
        ["composite",200],
        ["oxidant",1179],
        ["switch",56],
        ["transistor",13],
        ["ghodium_melt",150],
        ["crystal",110],
        ["microchip",4],
        ["circuit",1],
        ["device",1]
    ]
}

// Perhaps you want to know how many resources are needed to buy in the market besides what you have.
// Remember existenceBased, stopArr and stopResources?
>>> MarketCal.commodity.revenue(RESOURCE_DEVICE,{amount:10,buy:true,existenBased:true});
{
    "revenue":1017190.3200000001,
    "cooldown":62338,
    "lackingPriceResources":{},
    "buy":{                 // This object will set to empty if you do not let settings.buy = true, just like above.
        "energy":132690,
        "G":7500,
        "O":58950,
        "silicon":55550,
        "X":10500,
        "L":5500,
        "K":5500,
        "H":55250,
        "U":85150,
        "Z":10000
    },
    "recipes":[
        ["zynthium_bar",2000],
        ["utrium_bar",17030],
        ["reductant",11050],
        ["keanium_bar",1100],
        ["lemergium_bar",1100],
        ["purifier",2100],
        ["wire",11110],
        ["composite",2000],
        ["oxidant",11790],
        ["switch",560],
        ["transistor",130],
        ["ghodium_melt",1500],
        ["crystal",1100],
        ["microchip",40],
        ["circuit",10],
        ["device",10]
    ]
}

>>> MarketCal.commodity.revenue(RESOURCE_DEVICE,{amount:10,buy:true,existenBased:true,stopResources:[RESOURCE_SILICON], stopArr:[RESOURCE_WIRE,RESOURCE_SWITCH]});
{
    "revenue":606897.17,
    "cooldown":44920,
    "lackingPriceResources":{},
    "buy":{
        "energy":56890,
        "switch":560,
        "wire":6630,
        "G":7500,
        "O":5750,
        "X":10500,
        "L":5500,
        "K":5500,
        "H":55250,
        "U":10000,
        "Z":10000
    },
    "recipes":[
        ["zynthium_bar",2000],
        ["utrium_bar",2000],
        ["reductant",11050],
        ["keanium_bar",1100],
        ["lemergium_bar",1100],
        ["purifier",2100],
        ["composite",2000],
        ["oxidant",1150],
        ["transistor",130],
        ["ghodium_melt",1500],
        ["crystal",1100],
        ["microchip",40],
        ["circuit",10],
        ["device",10]
    ]
}


// You should notice that stopResources and existenceBased are separate! This means that the resources information will be added. Be careful!

// It is always the case that some kind of resources are shortage of supply in the market, such as "tissue". You can get their information if they are calculated.
>>> MarketCal.commodity.revenue(RESOURCE_ORGANISM, {ignoreNoData:false, stopArr:[ RESOURCE_TISSUE ]});
{
    "revenue":143152.243,
    "cooldown":2874.9,
    "lackingPriceResources":{   // This object will be set to empty if you do not let settings.ignoreNoData = true, just like above.
        "tissue":14,
        "biomass":1700
    },
    "buy":{},
    "recipes":[
        ["zynthium_bar",50],
        ["phlegm",3],
        ["lemergium_bar",364],
        ["ghodium_melt",150],
        ["reductant",200],
        ["oxidant",460],
        ["purifier",208],
        ["muscle",1],
        ["cell",340],
        ["liquid",150],
        ["organoid",1],
        ["organism",1]
    ]
}

// More details are in the API.

```
<a name = "..Example.bestCommodity"></a>
### [bestCommodity([stopResources], [settings])](#marketCalculator..bestCommodity)

This function will calculate the most profittable commodity you can produce **(only 1)**, which I will explain the [API](#..API).

```
// This function is the most powerful and the most expensive.
// Perhaps you want to know based on what I have, what is the most profitable commodity I can produce, considering buying lacking ones in the market?

>> MarketCal.commodity.bestCommodity();
{   // The most profitable commodity in the market.
    "cooldown":6237.500000000002,
    "revenue":105616.533,   // This is the gross income.
    "resourceType":"machine",
    "buy":{                 // Here the buy is usually not empty, indicating in order to produce this commodity, what should you buy.
        "energy":13453,
        "X":1040,
        "H":4050,
        "Z":8260,
        "metal":5550,
        "O":8800,
        "G":750,
        "U":1000
    },
    "recipes":[
        ["utrium_bar",200],
        ["ghodium_melt",150],
        ["oxidant",1760],
        ["alloy",1110],
        ["composite",200],
        ["zynthium_bar",1652],
        ["reductant",810],
        ["purifier",208],
        ["liquid",150],
        ["tube",35],
        ["fixtures",10],
        ["frame",2],
        ["hydraulics",1],
        ["machine",1]
    ]
}

// The first parameter becomes stopResources, and existenceBased and stopArr are all the same.
// Considering buying level 3 commodity in the market, and produce and sell level 5 commodity, among all the categories, what is the most profitable one?
>>> MarketCal.commodity.bestCommodity([ [ RESOURCE_SILICON,10000 ] ],{stopArr: [RESOURCE_FRAME, RESOURCE_MUSCLE, RESOURCE_MICROCHIP, RESOURCE_SPIRIT], existenceBased:true});
{
    "cooldown":4015.0999999999995,
    "revenue":98546.67199999999,
    "resourceType":"machine",
    "buy":{
        "frame":2,
        "metal":3930,
        "G":750
    },
    "recipes":[
        ["oxidant",1116],
        ["ghodium_melt",150],
        ["alloy",786],
        ["liquid",150],
        ["tube",27],
        ["fixtures",6],
        ["hydraulics",1],
        ["machine",1]
    ]
}

// Perhaps you do not have level 2~5 factories, so you only want to consider those you can produce.
>>> MarketCal.commodity.bestCommodity([],{detectLevel:true});
{
    "cooldown":24,
    "revenue":682.598,
    "resourceType":"switch",
    "buy":{
        "energy":88,
        "silicon":40,
        "O":95,
        "U":75
    },
    "recipes":[
        ["utrium_bar",15],
        ["oxidant",19],
        ["wire",8],
        ["switch",1]
    ]
}

// Perhaps you want to take the cooldown into account, because your system of factory is so complete that the ticks become the resriction.
>>> MarketCal.commodity.bestCommodity([],{detectLevel:true, perTick:true});
{
    "cooldown":24,
    "revenue":682.598,
    "resourceType":"switch",
    "buy":{
        "energy":88,
        "silicon":40,
        "O":95,
        "U":75
    },
    "recipes":[
        ["utrium_bar",15],
        ["oxidant",19],
        ["wire",8],
        ["switch",1]
    ]
}

// The calculation is always time-consuming, since it will enumerate all the commodities. But what if you only have rooms in NW and are only interested in producing "silicon" series and "compressed" ones?
>>> MarketCal.commodity.bestCommodity([],{series: ["silicon", "compressed"]});
{
    "cooldown":6233.799999999999,
    "revenue":101719.032,
    "resourceType":"device",
    "buy":{
        "energy":13269,
        "G":750,
        "O":5895,
        "silicon":5555,
        "X":1050,
        "L":550,
        "K":550,
        "H":5525,
        "U":8515,
        "Z":1000
    },
    "recipes":[
        ["zynthium_bar",200],
        ["utrium_bar",1703],
        ["reductant",1105],
        ["keanium_bar",110],
        ["lemergium_bar",110],
        ["purifier",210],
        ["wire",1111],
        ["composite",200],
        ["oxidant",1179],
        ["switch",56],
        ["transistor",13],
        ["ghodium_melt",150],
        ["crystal",110],
        ["microchip",4],
        ["circuit",1],
        ["device",1]
    ]
}
// More details are in the API.
```


<a name = "..API"></a>
## API

<a name="MarketCalculator"></a>

## MarketCalculator
**Kind**: global class  

* [MarketCal.commodity](#marketCalculator)
    * [.rawComponent(commodity, [settings])](#marketCalculator..rawComponent) ⇒ [<code>CommodityInformation</code>](#CommodityInformation) \| <code>Number</code>
    * [.revenue(commodity, [settings])](#marketCalculator..revenue) ⇒ <code>Object</code> \| [<code>Revenue</code>](#Revenue)
    * [.component(commodity, [settings])](#marketCalculator..component) ⇒ [<code>CommodityInformation</code>](#CommodityInformation) \| <code>Number</code>
    * [.bestCommodity(stopResources, [settings])](#marketCalculator..bestCommodity) ⇒ [<code>bestCommodity</code>](#bestCommodity)

<a name="marketCalculator..rawComponent"></a>

### MarketCal.commodity.rawComponent(commodity, [settings]) ⇒ [<code>CommodityInformation</code>](#CommodityInformation) \| <code>Number</code>
This function is mainly used for calculating the components to produce the commdity. 

It is, in most cases, useless, but it can give you a glimpse about how many resources are needed to produce that treasure.

This function is ***cheap***.

**Kind**: exposed method of [<code>MarketCal.commodity</code>](#marketCalculator)  
**Returns**: [<code>CommodityInformation</code>](#CommodityInformation) \| <code>Number</code> - Object | ERR_INVALID_ARGS | ERR_MAX_ITERATION_REACHED  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| commodity | <code>String</code> |  | Commodity. |
| [settings] | <code>Object</code> |  | Settings. |
| [settings.amount] | <code>Number</code> | <code>1</code> | The amount of commodity. |
| [settings.stopArr] | <code>String[]</code> | <code>[]</code> | Array of resources. The result will be shown based on these resources and basic resources. |
| [settings.maxIteration] | <code>Number</code> | <code>1024</code> | The maximum calculation iteration number. |

<a name="marketCalculator..revenue"></a>

### MarketCal.commodity.revenue(commodity, [settings]) ⇒ [<code>Revenue</code>](#Revenue) \| <code>Number</code>
This function is used to calculate the expected revenues of producing the commodity based on information about resources, which I will give more details in the examples.

Notice that:
- This function will return `ERR_NO_DATA` if the commodity itself does not have price in the market, no matter how the `settings.ignoreNoData` is.
- This function will calculate based on storage, terminal you have by default, if you set `settings.existenceBased` = true.
- `settings.stopResources` can exist with your storing information. But all the information about resources will be added. Be careful!

This function can be ***expensive***, but mostly ***cheap***.

**Kind**: exposed method of [<code>MarketCal.commodity</code>](#marketCalculator)  
**Returns**: [<code>Revenue</code>](#Revenue) \| <code>Number</code> - Object | ERR_NO_DATA

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| commodity | <code>String</code> |  | Commodity. |
| [settings] | <code>Object</code> |  | Settings. |
| [settings.amount] | <code>Number</code> | <code>1</code> | Amount. |
| [settings.stopResources] | <code>Array</code> | <code>[]</code> | An Array of information about resources( resourceType or [resourceType] or [resourceType,amount] ), which the calculation will stop on. |
| [settings.stopArr] | <code>String[]</code> | <code>[]</code> | Array of resources. The result will be shown based on these resources and basic resources. |
| [settings.ignoreNoData] | <code>Boolean</code> | <code>true</code> | Whether ignores potential no-data resources, if false, their information will be returned. |
| [settings.buy] | <code>Boolean</code> | <code>false</code> | Whether return the information about resources you need to buy. |
| [settings.existenceBased] | <code>Boolean</code> | <code>false</code> | Whether try to extract information from storing objects in the room, only if this is true, the following parameters related to storing will be used. |
| [settings.roomNames] | <code>String[]</code> \| <code>String</code> | <code>[]</code> | An array of roomNames \| one roomName \| [ ], meaning all. |
| [settings.storeObjects] | <code>Object[]</code> \| <code>Object</code> | <code>[]</code> | Additional storing objects. |
| [settings.findObjects] | <code>Boolean</code> | <code>false</code> | Whether try to find all storing objects in the room, this can cost additional **CPU** time. Notice that if you cache the structures to the Room object, this function will access them directly, and in this case, the default value for this parameter is true. |

<a name="marketCalculator..component"></a>

### MarketCal.commodity.component(commodity, [settings]) ⇒ [<code>CommodityInformation</code>](#CommodityInformation) \| <code>Number</code>
This function is mainly for calculating the **additional** components of commodity.

Notice that 
- This function will calculate based on `storage`, `terminal` by default, if you set `settings.existenceBased` = true.
- `settings.stopResources` can exist with your storing information. But all the information about resources will be added. Be careful!

This function can be ***expensive***, but mostly ***cheap***.

**Kind**: exposed method of [<code>MarketCal.commodity</code>](#marketCalculator)  
**Returns**: [<code>CommodityInformation</code>](#CommodityInformation) \| <code>Number</code> - Object | ERR_INVALID_ARGS | ERR_MAX_ITERATION_REACHED  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| commodity | <code>String</code> |  | Commodity. |
| [settings] | <code>Object</code> |  | Settings. |
| [settings.amount] | <code>Number</code> | <code>1</code> | The Amount of commodity. |
| [settings.stopResources] | <code>Array</code> | <code>[]</code> | An Array of information about resources( resourceType or [resourceType] or [resourceType,amount] ), which the calculation will stop on. |
| [settings.stopArr] | <code>String[]</code> | <code>[]</code> | Array of resources. The result will be shown based on these resources and basic resources. |
| [settings.existenceBased] | <code>Boolean</code> | <code>false</code> | Whether try to extract information from storing objects in the room, only if this is true, the following parameters related to storing will be used. |
| [settings.roomNames] | <code>String[]</code> \| <code>String</code> | <code>[]</code> | An array of roomNames \| one roomName \| [ ], meaning all. |
| [settings.storeObjects] | <code>Object[]</code> \| <code>Object</code> | <code>[]</code> | Additional storing objects. |
| [settings.findObjects] | <code>Boolean</code> | <code>false</code> | Whether to find all storing objects in the room, this can cost additional **CPU** time. Notice that if you cache the structures to the Room object, this function will access them directly, and in this case, the default value for this parameter is true. |

<a name="marketCalculator..bestCommodity"></a>

### MarketCal.commodity.bestCommodity([stopResources], [settings]) ⇒ [<code>BestCommodity</code>](#BestCommodity)
This function will calculate the most profittable commodity you can produce **(only 1)**.

You may think it will be much more useful to take multiply commodities into account. Or, at least, calculate the maximum amount you can produce of this most profitable commodity.

But if we take `battery` into account, you will find this commodity usually has stable supply and demand (not like level 5 *Commodity*). And its component, namely `energy`, is extremely easy to harvest. So, in this case, if we allow the amount to be more than 1, the result of calculation will usually be `battery`, given that it is usual the case player has much energy in their storage, but few high level commodities, which will lead to "covering" the high level commodities. And if you want to avoid this, you need to pass in complicated parameters to avoid this, which is also unavoidable for this function, since its duty is to calculate the most profitable commodity.

So, considering above, I decide to make this function only to calculate one.

Notice that 
- This function will **not** consider those commodities which require some resources lacking market data (shortage of supply), that you do not have either.
- This function will not detect the situation of your factorys' level by default, but you can turn it on by let `settings.detectLevel` = true.
- This function will calculate all categories (including *metal*, *silicon*, *mist*, *biomass*, *compressed*, *basic(regional basic commodity)* ) commodities by default, this can be time-consuming and waste **CPU**, given you just harvest and produce one type of commodity, you can change it in `setting.series`.
- This function will not take the cooldown time into account when evalutes the revenue of commodity by default, since it's usual the case for most players that the restriction of producing commodities is GPL, which makes the factory idle in most times.

This function is usually ***expensive***.

**Kind**: exposed method of [<code>MarketCal.commodity</code>](#marketCalculator)  
**Returns**: [<code>BestCommodity</code>](#bestCommodity) - Object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [stopResources] | <code>Array</code> | <code>[]</code> | An Array of information about resources( resourceType or [resourceType] or [resourceType,amount] ), which the calculation will stop on. |
| [settings] | <code>Object</code> |  | Settings. |
| [settings.series] | <code>Array</code> | <code>[&quot;biomass&quot;,&quot;mist&quot;,&quot;metal&quot;,&quot;silicon&quot;,&quot;compressed&quot;,&quot;basic&quot;]</code> | The categories of commodities this function will calculate: "compressed":all compressing commodities. "basic":"composite", "crystal" and "liquid". |
| [settings.stopArr] | <code>String[]</code> | <code>[]</code> | An Array of resources. The result will be shown based on these resources and basic resources. |
| [settings.detectLevel] | <code>Boolean</code> | <code>false</code> | Whether to detect the levels of factory automatically. |
| [settings.perTick] | <code>Boolean</code> | <code>false</code> | Whether take `cooldown` time into account when evaluates the revenue of the commodity. |
| [settings.existenceBased] | <code>Boolean</code> | <code>false</code> | Whether try to extract information from storing objects in the room, only if this is true, the following parameters related to storing will be used. |
| [settings.roomNames] | <code>String[]</code> \| <code>String</code> | <code>[]</code> | An array of roomNames \| one roomName \| [ ], meaning all. |
| [settings.storeObjects] | <code>Object[]</code> \| <code>Object</code> | <code>[]</code> | Additional storing objects. |
| [settings.findObjects] | <code>Boolean</code> | <code>false</code> | Whether to find all storing objects in the room, this can cost additional CPU time. Notice that if you cache the structures to the Room object, this function will access them directly, and in this case, the default value for this parameter is true. |

<a name="Revenue"></a>

## Revenue : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| revenues | <code>Number</code> | The expected revenues. |
| cooldown | <code>Number</code> | Total cooldown number. |
| buy | <code>Object</code> | Resources you need to buy, which has the format of [`resourceType`]:[`amount`]. |
| recipes | <code>Object</code> | An Array of Array, in the format of [`resourceType`,`amount`] , whose orders are organized. |
| lackingPriceResources | <code>Object</code> | Object describing needed resources which are shortage of supply, in the format of [`resourceType`]:[`amount`].

<a name="CommodityInformation"></a>

## CommodityInformation : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| cooldown | <code>number</code> | Total Cooldown Number. |
| components | <code>Object</code> | Object describing the total components, in the format of [`resourceType`]:[`amount`] |
| recipes | <code>Object</code> | An Array of Array, in the format of [`resourceType`,`amount`] , whose orders are organized. |

<a name="bestCommodity"></a>

## BestCommodity : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| resourceType | <code>String</code> | `resourceType`. |
| cooldown | <code>Number</code> | Total cooldown number. |
| revenue | <code>Number</code> | Revenue. |
| buy | <code>Object</code> | Resources you need to buy, which has the format of [`resourceType`]:[`amount`]. |
| recipes | <code>Object</code> | An Array of Array, in the format of [`resourceType`,`amount`] , whose orders are organized. |

<a name="CommodityComponent"></a>