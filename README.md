# Coroner
Useful dead link checking

## What's this?

Most tools for finding broken or dead links check for an HTTP error code like 404.

When a resource is missing, instead of returning an HTTP 404 code, servers will sometimes return:

- an HTTP 200 response and an HTML page saying 'page not found' or similar
- an HTTP redirect to the front page of the site (or of another site) not the resource requested
- an infinite chain of redirects
- a completely different resource than the one requested

coroner is designed to detect dead links:

- including all of the above situations
- rapidly (tested on lists of 1000s of URLs gathered from real sites)
- without hammering remote URLs (per-host rate limiting)
- as part of an automated pipeline (takes input through shell pipes and can output JSON test results)

## Installation

Install node and npm (for example, through [nvm](https://github.com/nvm-sh/nvm)).

Then, run the following:

```
npm install -g coroner
```

## Usage

To check one or more links

```
coroner http://test1.com http://test2.com
```

To check all the links within file containing a list of links

```
cat links.txt | coroner
```

To check all the links within a saved HTML file and return a list of failing URLs only

```
sed -n 's/.*href="\(h[^"]*\).*/\1/p' webpage.html | coroner -f
```

To check all the links within a live web page, skipping over internal links:

```
curl https://test.com | sed -n 's/.*href="\(h[^"]*\).*/\1/p' | coroner -s test.com
```

Check all links within markdown files in a folder or its subfolders recursively:

```
find . -name "*.md" -not \( -name .svn -prune -o -name .git -prune \) -type f -print0 | xargs -0 sed -n 's/.*(\(http[^)]*\).*/\1/p' | coroner
```

## Options

Options are:

```
  -h, --help            show this help message and exit
  --filter, -f          only show test failures (default: show full results)
  --json, -j            output results in JSON format (default: false)
  --skip SKIP, -s SKIP  skip links from the specified host
  --timeout TIMEOUT, -t TIMEOUT
                        maximum time (ms) to allow remote host to respond
  --cooldown COOLDOWN, -c COOLDOWN
                        minimum time (ms) between requests to a specific host
```