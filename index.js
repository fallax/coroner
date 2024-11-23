const tests = require('./tests.js');

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
        return null;
    }    
}

function runTests(testsToRun, input, options, response, responseText)
{
    for (var index in testsToRun)
    {
        if (testsToRun[index].test(input, options, response, responseText))
        {
            if (testsToRun[index].skipUrl)
            {
                input.skipped = true
                input.alive = true
            }
            else
            {
                input.alive = false
            }
            input.reason = testsToRun[index].reason(input, options, response, responseText)
            return false
        }
    }
    return true
}

async function checkURL(input, options) {

    if (!input.currentURL) { input.currentURL = input.url }

    // If any of the pre-request checks fail, return the input
    var pretests = tests.filter((i)=>i.phase=='pre')
    if (!runTests(pretests, input, options)) { return input }

    try {
        
        // Default options are marked with *
        const response = await fetch(input.currentURL, {
            signal: AbortSignal.timeout(options.timeout),
            method: "GET", 
            mode: "no-cors", // no-cors, *cors, same-origin
            cache: "reload", // Force the URL to be refetched fresh every time
            // credentials: "same-origin", // include, *same-origin, omit
            headers: {
                 "Accept": "*/*",
                 "User-Agent": "coroner/1.0.5"
             },
            redirect: "manual", // manual, *follow, error
            // referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        });

        // Grab the request body for testing against
        var responseText = null;
        if ([200,304,403].includes(response.status))
        {
            responseText = await response.text();
        }

        // If any of the post-request checks fail, return the input
        var posttests = tests
            .filter((i)=>i.phase=='post')
            .filter((i)=>i.statusCodes ? i.statusCodes.includes(response.status) : true)
            .filter((i)=>i.contentTypes ? i.contentTypes.includes(input.guessedContentType) : true)
        if (!runTests(posttests, input, options, response, responseText)) { return input }

        // If this a redirect, run the checks again on the redirect URL; otherwise return a success
        if ([301,302,303,307,308].includes(response.status))
        {
            // Check the resource we've been redirected to instead
            input.redirect = true;
            if (!input.redirects) { input.redirects = [input.currentURL] }
            input.currentURL = (new URL(response.headers.get("location"), input.currentURL)).href;
            input.redirects.push(input.currentURL)
            return await checkURL(input, options, input.url);
        }
        else
        {
            input.alive = true;
            return input;
        }

    } catch (error) {
        input.alive = false;
        input.reason = "Connection error: " + ((error.cause) ? error.cause.message : error)
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
        if (options.progress) { options.progress.increment(); options.progress.render() }
        if (!result.skipped)
        {
            lastRequest = Date.now()
        }
    }

    return output
}

async function check(input, options) {

    // Set default options for options if not provided already
    if (!options) { options = {} }
    if (!options.timeout) { options.timeout = 10000 }
    if (!options.cooldown) { options.cooldown = 5000 }
    if (!options.skippedHosts) { options.skippedHosts = [] }

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

            // Update total URLs number if we're showing the progress bar
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