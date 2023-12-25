#!/usr/bin/env node
const check = require('./index.js');



let data = "";

async function main() {

  if (process.argv.slice(2).length > 0)
  {
    var result = check(process.argv.slice(2));
    result.then(a => console.log(a));
  }
   else if (process.stdin)
  {
    for await (const chunk of process.stdin) data += chunk;
    data = data.split("\r\n");
    var result = check(data);
    result.then(a => console.log(a));
  }
  else
  {
    console.log("Usage: coroner <one or more URLs to check>");
  }

  return;
}

main();