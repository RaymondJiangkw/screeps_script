from core import Interface
import schedule,time
print("Load...")
inter = Interface("","")
print("Connection Successful!")
ORDER_TIME_INTERVAL = 70
MARKET_INFO_TIME = "12:00"
CREDIT_TIME_INTERVAL = 10
schedule.every(ORDER_TIME_INTERVAL).minutes.do(inter.insertAllResourceOrder)
schedule.every().day.at(MARKET_INFO_TIME).do(inter.insertMarketInfo)
schedule.every(CREDIT_TIME_INTERVAL).minutes.do(inter.insertCreditRecord)
print("Setting Successful!")
while True:
    schedule.run_pending()
    time.sleep(1)