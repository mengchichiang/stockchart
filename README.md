# stockchart
Stockchart is portfolio managment, Yahoo Finance historical quotes downloader and plot stock chart.
It focus on TW(Taiwan台股) HK(HongKong港股) and US stockmarket.

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
6. input user name: admin password:1234

## Usage

### Portfolio example
  * A example csv  file `/stockchart/portfolioUS.csv` can be import  under group US.
  * US market stock can be list in group TW or HK if  the format is xxxx.US.

### config.ini
  * Setup username and password.
  * Setup download start year.
