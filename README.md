# stockchart
Stockchart is portfolio managment, Yahoo Finance historical quotes downloader and plot stock chart.
It focus on Taiwan(台股), HongKong(港股) and US stock market.

## Quick start
1. install node.js and mongodb 
2. `$git clone https://github.com/mengchichiang/stockchart.git`
3. install node module
 ```
  $cd stockchart
  $npm install
 ```
 
4. server run
 ```
  $./bin/www
 ```
 
5. open browser 
    http://localhost:3000/

6. login
 ```
 user name: admin
 password:1234
 ```
 
## Usage

### Portfolio example
  * Import example csv  file `/stockchart/portfolioUS.csv` under group US. Then download data and plot charts.
  * add US market stock symbol(Yahoo Finance stock symbol) to group TW or HK by using xxxx.US format.

### config.ini
  * Setup login user name and password.
  * Setup download start year.
