# stockchart
Stockchart is portfolio managment, Yahoo Finance historical quotes downloader and plot stock chart.
It focus on Taiwan, HongKong and US stock market.

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

## License

<pre>
The MIT License (MIT)

Copyright (c) 2016 mengchichiang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
</pre>

