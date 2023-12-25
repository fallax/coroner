
const blacklist = ["not found", "404", "problem ", "missing ", "unknown "];

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

    const socialmediaprefixes = [
        "https://twitter.com",
        "https://www.twitter.com",
        "https://facebook.com",
        "https://www.facebook.com",
        "https://instagram.com",
        "https://www.instagram.com"
    ];

    for (var prefix of socialmediaprefixes)
    {
        if (url.startsWith(prefix)) return 3;
    }

    if (url.includes(".pdf"))
    {
        return 2;
    }

    // Guess that this is probably just a normal HTML page
    // TODO: we may want to actually try downloading at this point?
    return 1;
}

async function checkURL(url, options) {

    if (url.length == 0)
    {
        return {"url": url, "alive": false, "reason": "Empty URL"};
    }

    try {
        // Default options are marked with *
        const response = await fetch(url, {
            method: "GET", // *GET, POST, PUT, DELETE, etc.
            mode: "no-cors", // no-cors, *cors, same-origin
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
                    return {"url": url, "alive": false, "reason": "Page improbably small: size was " + res.headers["content-length"]};
                }

                // Check content type is something expected
                if (options && options['expected']) {
                    // response.headers["Content-Type"]
                }
                else
                {
                    // no expected content type given - try and guess it instead
                }
                

                // Check the response body looks like valid HTML
                var body = await response.text();
                if (!body.trim().toLowerCase().startsWith("<!doctype html")) {
                    return {"url": url, "alive": false, "reason": "Does not look like a valid HTML file: first characters are " + body.trim().slice(0, 25).toLowerCase()};
                }

                return {"url": url, "alive": true};

                break;
            default:
                return {"url": url, "alive": false, "reason": "Bad HTTP status: " + response.status};
        }
      } catch (error) {
        return {"url": url, "alive": false, "reason": "Connection error: " + ((error.cause) ? error.cause.code : error)};
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