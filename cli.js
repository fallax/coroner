#!/usr/bin/env node
const check = require('./index.js');
const { ArgumentParser } = require('argparse');
const cliProgress = require('cli-progress');
const colors = require('ansi-colors');

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
      help: 'a list of URLs to check'
    }
  )

  parser.add_argument(
    '--filter', '-f',
    {
      help:'only show test failures (default: show full results)',
      action: 'store_true'
    }
  )

  // create new progress bar
  const b1 = new cliProgress.SingleBar({
    format: '' + colors.cyan('{bar}') + '| {percentage}% || {value}/{total} checked',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    synchronousUpdate: true
  });

  var args = parser.parse_args();

  if (args.urls.length > 0)
  {
    var result = check(args.urls);
    result.then((a) => 
    {
      process.stdout.write(JSON.stringify(a.filter(b => !args.filter || !b.alive)));
      process.stdout.write("\n"); 
    });
  }
   else if (process.stdin)
  {
    for await (const chunk of process.stdin) data += chunk;
    data = data.split(/\r?\n/) // split lines apart
    data = data.map(a => a.trim())
    data = data.filter(a => a.length > 0)

    b1.start(data.length, 0, {
      speed: "N/A"
    });

    var result = check(data, {progress: b1, timeout: 10000, cooldown: 10000});
    result.then((a) => 
    {
      b1.update()
      b1.stop()
      process.stdout.write(JSON.stringify(a.filter(b => !args.filter || !b.alive))); 
      process.stdout.write("\n"); 
    });
    
  }
  else
  {
    console.log("Usage: coroner <one or more URLs to check>");
  }

  return;
}

main();