# Coroner
Useful dead link checking

## What's this?

Existing checks for broken or dead links tend to miss more subtle types of link rot, such as:

- redirecting the user to the front page of the site instead of the content they requested
- returning an error page but with an HTTP 200 response
- returning an HTML page (such as a 'this content has now moved' page) when a PDF was requested

coroner is designed to handle:

- diverse types of link rot
- rapidly (tested on lists of 1000s of URLs gathered from real sites)
- without hammering remote URLs (per-host rate limiting)
- returning an explanation of suspected cause of link death

## Usage

To check one or more links

```
node cli.js http://test1.com http://test2.com
```

To check all the links within file containing a list of links

```
cat links.txt | node cli.js
```

To check all the links within a saved HTML file and return a list of failing URLs only

```
sed -n 's/.*href="\(h[^"]*\).*/\1/p' webpage.html | node cli.js -f
```