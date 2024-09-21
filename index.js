const parse = require('node-html-parser').parse;

const blacklist = ["page not found", "resource not found", "file not found", "error 404", "404 - not found", "404 not found", "server error", "service unavailable", "cannot be found", "was not found"];

const socialmediaprefixes = [
    "https://twitter.com",
    "https://www.twitter.com",
    "https://facebook.com",
    "https://www.facebook.com",
    "https://instagram.com",
    "https://www.instagram.com"
];

const skippedHosts = [
    "fonts.googleapis.com",
    "twitter.com",
    "web.archive.org"
]

const checkedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/html"
]

// Return a URL in a consistent format for comparing to other urls
// NB: comparisons remain case-sensitive!
function consistentURL(input) {
    if (input.substring(0,4) != "http") { input = "//" + input } // forwardslashes to ensure it grabs the schema      

    // try and make a new URL object
    try {
        var url = new URL(input, "http://www.example.com")
        
        // Construct a standardised URL
        var host = url.host.replace("www.", "")
        var path = url.pathname
        if (path.length > 1 && path[path.length - 1] == "/") { path = path.slice(0, path.length - 1) }

        return url.protocol + "//" + host + path + url.search;
    }
    catch (error) {
        console.log(error)
        console.log(input)
        return null;
    }    
}

function GuessContentType(url) {
    
    if (url.pathname.toLowerCase().endsWith(".pdf")) {
        return "application/pdf";
    } 
    
    if (url.pathname.toLowerCase().endsWith(".doc")) {
        return "application/msword";
    }

    if (url.pathname.toLowerCase().endsWith(".docx")) {
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }

    if (url.pathname.toLowerCase().endsWith(".odt")) {
        return "application/vnd.oasis.opendocument.text";
    }

    if (url.pathname.toLowerCase().endsWith(".js")) {
        return "text/javascript";
    }

    if (url.pathname.toLowerCase().endsWith(".woff")) {
        return "font/woff";
    }

    if (url.pathname.toLowerCase().endsWith(".woff2")) {
        return "font/woff2";
    }

    if (url.pathname.toLowerCase().endsWith(".css")) {
        return "text/css";
    }

    for (var prefix of socialmediaprefixes) {
        if (url.hostname.toLowerCase().startsWith(prefix)) return "text/html";
    }

    return "text/html";
}

async function checkURL(input, options) {

    var toCheck = input.redirectURL ? input.redirectURL : input.url
    
    // Do we have a valid URL?
    if (toCheck.length == 0) {
        input.guessedContentType = null;
        input.alive = false;
        input.reason = "Empty URL";
        if (options.progress) { options.progress.increment(); options.progress.render() }
        return input;
    }
    else {
        try {
            let url = new URL(input.url);

            // Skip checking this item if the mime type isn't something we check
            input.guessedContentType = GuessContentType(url);
            
            if (!checkedMimeTypes.includes(input.guessedContentType))
            {
                input.skipped = true
                input.alive = true
                if (options.progress) { options.progress.increment(); options.progress.render() }
                return input
            }

            // Skip checking this item if the host is in the list of hosts to skip
            if (skippedHosts.includes(url.host))
            {
                input.skipped = true
                input.alive = true
                input.reason = "Host on list to skip: " + url.host
                if (options.progress) { options.progress.increment(); options.progress.render() }
                return input
            }
        }
        catch (error) {
            input.alive = false;
            input.reason = error.message;
            if (options.progress) { options.progress.increment(); options.progress.render() }
            return input;
        }
    }

    try {

        // Default options are marked with *
        const response = await fetch(toCheck, {
            signal: AbortSignal.timeout(options.timeout),
            method: "GET", 
            mode: "no-cors", // no-cors, *cors, same-origin
            cache: "reload", // Force the URL to be refetched fresh every time
            // credentials: "same-origin", // include, *same-origin, omit
            // headers: {
            //     "Accept": "*/*",
            //     "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"
            // },
            redirect: "manual", // manual, *follow, error
            // referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        });

        // status code
        switch (response.status) {
            case 301:
            case 302:
                let originalURL = new URL(toCheck);
                let redirectURLString = response.headers.get("location");
                if (redirectURLString[0] == "/") {
                    redirectURLString = originalURL.protocol + originalURL.hostname + redirectURLString;
                }
                let redirectURL = new URL(redirectURLString);

                if (originalURL.pathname.length > 2) {
                    if (redirectURL.pathname.length < 2) {
                        input.alive = false;
                        input.reason = "Redirected to root page " + redirectURL;
                        if (options.progress) { options.progress.increment(); options.progress.render() }
                        return input;
                    }
                }

                return await checkURL({url: input.url, consistentURL: input.consistentURL, redirect: true, redirectURL: redirectURLString }, options, input.url);

            case 200:
            case 304:
                // Check this page isn't far too short
                if (response.headers["content-length"] < 500) {
                    input.alive = false;
                    input.reason = "Page improbably small: size was " + res.headers["content-length"];
                    if (options.progress) { options.progress.increment(); options.progress.render() }
                    return returnValue;
                }

                // Check content type is something expected
                if (response.headers["Content-Type"] && (response.headers["Content-Type"] != input.guessedContentType)) {
                    input.alive = false;
                    input.reason = "Page doesn't appear to have right type of content: " + response.headers["Content-Type"] + " vs " + input.guessedContentType;
                    if (options.progress) { options.progress.increment(); options.progress.render() }
                    return input;
                }

                // Check the response body looks like a valid response for this presumed content type
                var body = await response.text();
                var excerpt = body.slice(0, 30).trim().toLowerCase();
                switch (input.guessedContentType) {
                    case "text/html":
                        if (
                            !excerpt.startsWith("<!doctype") && 
                            !excerpt.startsWith("<html") &&
                            !excerpt.startsWith("<!--")
                        ) {
                            input.alive = false;
                            input.reason = "Does not look like a valid HTML file: first characters are " + excerpt;
                            if (options.progress) { options.progress.increment(); options.progress.render() }
                            return input;
                        }
                        break;
                    case "application/pdf":
                        if (!excerpt.startsWith("%pdf-")) {
                            input.alive = false;
                            input.reason = "Does not look like a valid PDF file: first characters are " + excerpt;
                            if (options.progress) { options.progress.increment(); options.progress.render() }
                            return input;
                        }
                        break;
                }

                // Check if this appears to be an error page that isn't returning the right HTTP result code
                if (input.guessedContentType == "text/html")
                {
                    // Parse html and remove script tags etc that won't be displayed on 
                    var html = null
                    html = parse(body, {
                        blockTextElements: { // ignore these tags
                          script: false,
                          noscript: false,
                          style: false,
                          pre: false
                        }
                      })
                    var searchString = html.toString().toLowerCase()

                    for (var phrase in blacklist)
                    {
                        if (searchString.includes(blacklist[phrase]))
                        {
                            input.alive = false;
                            input.reason = "HTML document contains phrase '" + blacklist[phrase] + "'";
                            if (options.progress) { options.progress.increment(); options.progress.render() }
                            return input;
                        }
                    }
                }

                input.alive = true;
                if (options.progress) { options.progress.increment(); options.progress.render() }
                return input;
            default:
                input.alive = false;
                input.reason = "Bad HTTP status: " + response.status;
                if (options.progress) { options.progress.increment(); options.progress.render() }
                return input;
        }
    } catch (error) {
        input.alive = false;
        input.reason = "Connection error: " + ((error.cause) ? error.cause.message : error)
        if (options.progress) { options.progress.increment(); options.progress.render() }
        return input;
    }
}

async function checkBatch(urls, options)
{
    var output = []
    var lastRequest = 0
    
    for (let url in urls)
    {
        if (Date.now() - lastRequest < options.cooldown)
        {
            let sleepTime = (lastRequest + options.cooldown) - Date.now()
            await new Promise(resolve => setTimeout(resolve, sleepTime))
        }

        var result = await checkURL(urls[url], options)
        output.push(result)
        if (!result.skipped)
        {
            lastRequest = Date.now()
        }
    }

    return output
}

async function check(input, options) {

    if (!options) { options = 
        {
            timeout: 10000,
            cooldown: 5000,
        }
    }

    switch (typeof (input)) {
        case "object":
            if (!input.length) { throw ("Unexpected input") };

            // Create objects to represent all of our URLs
            urls = input.map((element) => { return {"url": element, "consistentURL": consistentURL(element)}});

            // Remove any duplicates immediately
            let uniqueInputs = {};
            urls.forEach((element) => {
                if (!Object.keys(uniqueInputs).includes(element.consistentURL)) {
                    uniqueInputs[element.consistentURL] = element;
                }
            });
            urls = Object.values(uniqueInputs);

            // Update total URLs number if we're showing progress
            if (options.progress) { options.progress.setTotal(urls.length)}

            // Split URLs up by host and run serially within a host
            hosts = {}
            urls.forEach((element) => {
                let host = element.consistentURL ? (new URL(element.consistentURL)).host : "unknown"
                if (!hosts[host]) { hosts[host] = []}
                hosts[host].push(element)   
            })
            var results = await Promise.all(Object.keys(hosts).map(host => checkBatch(hosts[host], options))) 

            results = results.flat()
            results.sort((a,b) => a.consistentURL == b.consistentURL ? 0 : a.consistentURL < b.consistentURL ? -1 : 1) // sort alphabetically

            return results;
            break;
        case "string":
            return check([input], options);
            break;
        default:
            throw ("Unknown input type");
            return 1;
    }
}

module.exports = check;