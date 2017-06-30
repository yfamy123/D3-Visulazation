/**
 * Created by fnyang on 6/28/17.
 */
var fs = require('fs');
var qs = require('querystring');


// function transToJson(s) {
//     var s = s.replace(/[{}\s]/g,'');
//     return qs.parse(s,'||','=');
// }

var d3 = require('d3');

const string = "{domain=preprod|| realm=us-east-1|| lastModified=2017-06-28T22:25:58.743Z}".replace(/[\s]/g,'').replace(/\|\|/g,',').replace(/=/g,':');

var formatDate = d3.time.format("%Y-%m-%d");

console.log(formatDate(new Date("2017-06-28T00:01:42.526Z")));



// JSON.parse("{domain=preprod|| realm=us-east-1|| lastModified=2017-06-28T22:25:58.743Z}".replace(/\|\|/gi,","), function (key, value) {
//     console.log("key: " + key + ", value: " + value);
// }

// console.log(query);