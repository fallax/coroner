
const blacklist = ["not found", "404", "problem ", "missing ", "unknown "];

const socialmediaprefixes = [
    "https://twitter.com",
    "https://www.twitter.com",
    "https://facebook.com",
    "https://www.facebook.com",
    "https://instagram.com",
    "https://www.instagram.com"
];

const skippedHosts = [
    "https://fonts.googleapis.com"
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

async function checkURL(input, options, originalURL) {

    var toCheck = input.redirectURL ? input.redirectURL : input.url

    // Do we have a valid URL?
    if (toCheck.length == 0) {
        input.guessedContentType = null;
        input.alive = false;
        input.reason = "Empty URL";
        return input;
    }
    else {
        try {
            let url = new URL(toCheck);
            
            // Skip checking this item if the mime type isn't something we check
            input.guessedContentType = GuessContentType(url);
            if (!checkedMimeTypes.includes(input.guessedContentType))
            {
                input.skipped = true
                input.alive = true
                return input
            }
        }
        catch (error) {
            input.alive = false;
            input.reason = error.message;
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
                    return returnValue;
                }

                // Check content type is something expected
                if (response.headers["Content-Type"] && (response.headers["Content-Type"] != input.guessedContentType)) {
                    input.alive = false;
                    input.reason = "Page doesn't appear to have right type of content: " + response.headers["Content-Type"] + " vs " + input.guessedContentType;
                    return input;
                }

                // Check the response body looks like a valid response for this presumed content type
                var body = await response.text();
                switch (input.guessedContentType) {
                    case "text/html":
                        if (!body.trim().toLowerCase().startsWith("<!doctype") && !body.trim().toLowerCase().startsWith("<html")) {
                            input.alive = false;
                            input.reason = "Does not look like a valid HTML file: first characters are " + body.trim().slice(0, 25).toLowerCase();
                            return input;
                        }
                        break;
                    case "application/pdf":
                        if (!body.trim().toLowerCase().startsWith("%pdf-")) {
                            input.alive = false;
                            input.reason = "Does not look like a valid PDF file: first characters are " + body.trim().slice(0, 25).toLowerCase();
                            return input;
                        }
                        break;
                }

                input.alive = true;
                return input;

                break;
            default:
                input.alive = false;
                input.reason = "Bad HTTP status: " + response.status;
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
    for (url in urls)
    {
        if (Date.now() - lastRequest < options.cooldown)
        {
            let sleepTime = (lastRequest + options.cooldown) - Date.now()
            await new Promise(resolve => setTimeout(resolve, sleepTime))
        }

        lastRequest = Date.now()
        output.push(await checkURL(urls[url], options))
    }
    return output
}

async function check(input, options) {

    if (!options) { options = 
        {
            timeout: 5000,
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

            // TEMP: skip any twitter urls
            urls = urls.filter(a => !a.consistentURL.startsWith("https://twitter"));

            // TODO: split URLs up by host and run serially within a host
            hosts = {}
            urls.forEach((element) => {
                let host = element.consistentURL ? (new URL(element.consistentURL)).host : "unknown"
                if (!hosts[host]) { hosts[host] = []}
                hosts[host].push(element)   
            })
            
            var results = await Promise.all(Object.keys(hosts).map(host => checkBatch(hosts[host], options))) //await Promise.all(urls.map(item => checkURL(item, options)));

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