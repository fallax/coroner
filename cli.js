#!/usr/bin/env node
import { check } from './index.js';
import { ArgumentParser } from 'argparse';
import { SingleBar } from 'cli-progress';
import { parse } from 'node-html-parser';
import Sitemapper from 'sitemapper';
import pkg from 'ansi-colors';

const { grey, red, blue, cyan } = pkg;

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
      var status = (!args.filter) ? element.alive ? (element.skipped ? (grey("SKIP") + " ") : grey("   ✓ ")) : (red("DEAD") + " ") : ""
      var url = (element.alive) ? grey(element.url) : element.url
      process.stdout.write(status + url + "\n");
    });
  }
  process.stdout.write("\n"); 
}

async function getSiteUrls(url, getUrlsBar) {

  // Find the sitemap url for this site
  var siteMapUrl = url + "/sitemap.xml"

  const site = new Sitemapper({
    url: siteMapUrl,
    timeout: 15000, // TODO: make this follow the general timeout options
  });

  var output = []

  try {
    const { sites } = await site.fetch();
    getUrlsBar.setTotal(sites.length)
    for (var page of sites) {
      output.push(await getPageUrls(page))
      // Update progress bar
      getUrlsBar.increment(); getUrlsBar.render()

      // Sleep for a bit to avoid hammering
      var sleepTime = 1000
      await new Promise(resolve => setTimeout(resolve, sleepTime))
    }
    return output.flat()
  } catch (error) {
    console.log(error);
    return null
  }
}

async function getPageUrls(page) {
  // Default options are marked with *
  const response = await fetch(page, {
      timeout: 10000, // TODO: make this follow the general timeout options
      method: "GET", 
      headers: {
          "Accept": "*/*",
          "User-Agent": "coroner/1.0.6"
      },
      redirect: "manual"
  });

  // Grab the request body for testing against
  var responseText = null;
  if ([200,304,403].includes(response.status))
  {
    responseText = await response.text();
  }

  var parsedHtml = parse(responseText)
  var links = parsedHtml.getElementsByTagName("A")
  
  return links.map((element) => { return { "source": page, "url": element.getAttribute("href") }})
}

async function main() {

  const parser = new ArgumentParser({
    description: 'Coroner: checks whether links are alive or dead'
  });

  parser.add_argument(
    'action', 
    {
      metavar: 'ACTION',
      choices: ['url', 'page', 'site'],
      help: 'which type of thing to check (url, page containing urls, or site containing pages containing urls)'
    }
  )

  parser.add_argument(
    'targets', 
    {
      metavar: 'TARGETs', 
      type: 'str', 
      nargs: '*',
      help: 'a list of targets (urls, pages, or sites) to check'
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

  parser.add_argument(
    '--skip', '-s',
    {
      type: 'str', 
      help:'skip links from the specified host',
      action: 'append',
      default: []
    }
  )

  parser.add_argument(
    '--timeout', '-t',
    {
      type: 'int', 
      help: 'maximum time (ms) to allow remote host to respond',
      action: 'store',
      default: 10000
    }
  )

  parser.add_argument(
    '--cooldown', '-c',
    {
      type: 'int', 
      help: 'minimum time (ms) between requests to a specific host',
      action: 'store',
      default: 5000
    }
  )

  var args = parser.parse_args();

  // Generate our list of URLs to check
  var toCheck = []
  if (args.targets.length > 0)
  {
    // create new progress bar
    const getUrlsBar = new SingleBar({
      format: '' + blue('{bar}') + '| {percentage}% || {value}/{total} pages checked for links',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
      synchronousUpdate: true
    });

    switch (args.action)
    {
      case 'url':
        toCheck = args.targets
        break;
      case 'page':
        // TODO: should we automatically skip other URLs in this host?
        for (var page of args.targets)
        {
          toCheck = await getPageUrls(page)
        }
        break;
      case 'site':
        // TODO: should we automatically skip URLs within this host?
        getUrlsBar.start(data.length, 0, {
          speed: "N/A"
        });

        for (var site of args.targets)
        {
          toCheck = await getSiteUrls(site, getUrlsBar)
        }

        getUrlsBar.update()
        getUrlsBar.stop()
        break;
    }
  }
  else if (process.stdin)
  {
    for await (const chunk of process.stdin) data += chunk;
    data = data.split(/\r?\n/) // split lines apart
    data = data.map(a => a.trim())
    data = data.filter(a => a.length > 0)

    // TODO: switch on target type as above
    toCheck = data
  }

  if (toCheck.length > 0)
  {
    // create new progress bar
    const b1 = new SingleBar({
      format: '' + cyan('{bar}') + '| {percentage}% || {value}/{total} checked',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
      synchronousUpdate: true
    });

    b1.start(data.length, 0, {
      speed: "N/A"
    });

    var result = check(toCheck, {progress: b1, timeout: args.timeout, cooldown: args.cooldown, skippedHosts: args.skip});
    result.then((a) => 
    {
      b1.update()
      b1.stop()
      output(a, args)
      // TODO: return a useful exit code
      process.exit()
    });
  }
  else
  {
    console.log("Usage: coroner <action> <one or more TARGETs to check>");
    process.exit(1)
  }
}

main();