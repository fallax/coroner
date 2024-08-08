#!/usr/bin/env node
const check = require('./index.js');

let data = "";

const onlyFailures = true;

async function main() {

  if (process.argv.slice(2).length > 0)
  {
    var result = check(process.argv.slice(2));
    result.then((a) => 
    {
      // TODO: sorting by a sensible order maybe?
      console.log(a.filter(b => !onlyFailures || !b.alive));
    });
  }
   else if (process.stdin)
  {
    for await (const chunk of process.stdin) data += chunk;
    data = data.split("\r\n");
    data = data.filter(a => a.length > 0);
    var result = check(data);
    result.then((a) => 
    {
      // TODO: write to stdout
      console.log(a.filter(b => !onlyFailures || !b.alive));
    });
  }
  else
  {
    console.log("Usage: coroner <one or more URLs to check>");
  }

  return;
}

main();