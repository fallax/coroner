#!/usr/bin/env node
const check = require('./index.js');
const { ArgumentParser } = require('argparse');
const cliProgress = require('cli-progress');
const colors = require('ansi-colors');

let data = "";

function output(results, args) {
  var items = results.filter(b => !args.filter || !b.alive)
  if (args.json)
  {
    process.stdout.write(JSON.stringify(items));
  }
  else
  {
    items.forEach(element => {
      var status = (!args.filter) ? element.alive ? (element.skipped ? (colors.grey("SKIP") + " ") : colors.grey("   ✓ ")) : (colors.red("DEAD") + " ") : ""
      var url = (element.alive) ? colors.grey(element.url) : element.url
      process.stdout.write(status + url + "\n");
    });
  }
  process.stdout.write("\n"); 
}

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

  parser.add_argument(
    '--json', '-j',
    {
      help:'output results in JSON format',
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
    result.then((a) => { output(a, args) });
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
      output(a, args)
    });
    
  }
  else
  {
    console.log("Usage: coroner <one or more URLs to check>");
  }

  return;
}

main();