
const blacklist = ["not found", "404", "problem ", "missing ", "unknown "];

const socialmediaprefixes = [
    "https://twitter.com",
    "https://www.twitter.com",
    "https://facebook.com",
    "https://www.facebook.com",
    "https://instagram.com",
    "https://www.instagram.com"
];

function GuessContentType(url)
{
    if (url.pathname.endsWith(".pdf"))
    {
        return "application/pdf";
    }

    for (var prefix of socialmediaprefixes)
    {
        if (url.hostname.startsWith(prefix)) return "text/html";
    }

    // TODO: more stuff

    return "text/html";
}

// Returns a guess at the type of resource that is available at this URL
// Types:
// 0: Book,
// 1: Webpage,
// 2: PDF,
// 3: Org,
// 4: DOC
function GuessURLType(url)
{
    const bookprefixes = [
        "https://books.google.com",
        "https://uk.jkp.com"
    ];

    for (var prefix of bookprefixes)
    {
        if (url.startsWith(prefix)) return 0;
    }

    if (url.includes(".pdf"))
    {
        return 2;
    }

    // Guess that this is probably just a normal HTML page
    // TODO: we may want to actually try downloading at this point?
    return 1;
}

// Based on https://dmitripavlutin.com/timeout-fetch-request/
async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 8000 } = options;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
  
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal  
    });
    clearTimeout(id);
  
    return response;
  }

async function checkURL(url, options) {

    var returnValue = {
        "url": url
    };

    // Do we have a valid URL?
    if (url.length == 0)
    {
        return {"url": url, "guessedContentType": null, "alive": false, "reason": "Empty URL"};
    }

    const parsedURL = new URL(url);
    console.log(parsedURL.hostname); // "www.example.com"
    console.log(parsedURL.pathname); // "/cats"

    returnValue.guessedContentType = GuessContentType(new URL(url));

    try {
        // Default options are marked with *
        const response = await fetchWithTimeout(url, {
            timeout: 3000,
            method: "GET", // *GET, POST, PUT, DELETE, etc.
            mode: "cors", // no-cors, *cors, same-origin
            cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
            credentials: "same-origin", // include, *same-origin, omit
            headers: {
                "Accept": "*/*",
                "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"
            },
            redirect: "follow", // manual, *follow, error
            referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        });

        // status code
        switch (response.status)
        {
            case 200:
            case 304:
                // Check this page isn't far too short
                if (response.headers["content-length"] < 500) {
                    returnValue.alive = false;
                    returnValue.reason = "Page improbably small: size was " + res.headers["content-length"];
                    return returnValue;
                }

                // Check content type is something expected
                if (response.headers["Content-Type"] && (response.headers["Content-Type"] != returnValue.guessedContentType))
                {
                    returnValue.alive = false;
                    returnValue.reason = "Page doesn't appear to have right type of content: " + response.headers["Content-Type"] + " vs " + returnValue.guessedContentType;
                    return returnValue;
                }                

                // Check the response body looks like a valid response for this presumed content type
                var body = await response.text();
                switch (returnValue.guessedContentType)
                {
                    case "text/html":
                        if (!body.trim().toLowerCase().startsWith("<!doctype html")) {
                            returnValue.alive = false;
                            returnValue.reason = "Does not look like a valid HTML file: first characters are " + body.trim().slice(0, 25).toLowerCase();
                            return returnValue;
                        }
                        break;
                    case "application/pdf":
                        if (!body.trim().toLowerCase().startsWith("%pdf-")) {
                            returnValue.alive = false;
                            returnValue.reason = "Does not look like a valid PDF file: first characters are " + body.trim().slice(0, 25).toLowerCase();
                            return returnValue;
                        }
                        break;
                }

                returnValue.alive = true;
                return returnValue;

                break;
            default:
                returnValue.alive = false;
                returnValue.reason = "Bad HTTP status: " + response.status;
                return returnValue;
        }
      } catch (error) {
        returnValue.alive = false;
        returnValue.reason = "Connection error: " + ((error.cause) ? error.cause.code : error)
        return returnValue;
      }
}

async function check(input, options) {
    switch(typeof(input))
    {
        case "object":
            if (!input.length) { throw("Unexpected input")};

            // TODO: split URLs up by host and run serially within a host 

            var results = await Promise.all(input.map(item => checkURL(item, options)));

            return results;
            break;
        case "string":
            return checkURL(input, options);
            break;
        default:
            throw("Unknown input type");
            return 1;
    }
}

module.exports = check;