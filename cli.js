#!/usr/bin/env node
const check = require('./index.js');
const { ArgumentParser } = require('argparse');

let data = "";

async function main() {

  const parser = new ArgumentParser({
    description: 'Coroner: checks whether links are alive or dead'
  });

  parser.add_argument(
    'urls', 
    {
      metavar: 'URLs', 
      type: 'str', 
      nargs: '*',
      help: 'URL to check'
    }
  )

  parser.add_argument(
    '--filter', '-f',
    {
      help:'only show test failures (default: show full results)',
      action: 'store_true'
    }
  )

  var args = parser.parse_args();

  if (args.urls.length > 0)
  {
    var result = check(args.urls);
    result.then((a) => 
    {
      // TODO: sorting by a sensible order maybe?
      console.log(a.filter(b => !args.filter || !b.alive));
    });
  }
   else if (process.stdin)
  {
    for await (const chunk of process.stdin) data += chunk;
    data = data.split("\r\n");
    data = data.filter(a => a.length > 0);
    var result = check({url: data});
    result.then((a) => 
    {
      // TODO: write to stdout
      console.log(a.filter(b => !args.filter || !b.alive));
    });
  }
  else
  {
    console.log("Usage: coroner <one or more URLs to check>");
  }

  return;
}

main();