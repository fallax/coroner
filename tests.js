import { parse } from 'node-html-parser';

// Blacklist of phrases that indicate this is likely a page not found or error page
const blacklist = ["page not found", "resource not found", "file not found", "error 404", "404 - not found", "404 not found", "server error", "service unavailable"];

// List of mimetypes whose contents are checked (i.e. not automatically skipped)
const checkedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/html"
]

const mimeTypes =
{
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".odt": "application/vnd.oasis.opendocument.text",
    ".js": "text/javascript",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".css": "text/css",
    ".htm": "text/html",
    ".html": "text/html",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp"
}

export function getURL(input) {
    return input.source ? new URL(input.currentURL, input.source) : new URL(input.currentURL)
}

// Given a URL, return a guess of the mimetype of the data that will be served from it
function GuessContentType(url) {
    
    var extensions = Object.keys(mimeTypes)
    for (var index in extensions)
    {
        if (url.pathname.toLowerCase().endsWith(extensions[index])) {
            return mimeTypes[extensions[index]];
        } 
    }

    return "text/html";
}

// Given the following text string containing an HTML document, look for any of the provided search strings
// Returns: the first of the strings found in the HTML document
function searchHtml(html, searchStrings)
{
    var parsedHtml = parse(html, {
        blockTextElements: { // ignore these HTML tags
        script: false,
        noscript: false,
        style: false,
        pre: false
        }
    })
    var searchString = parsedHtml.toString().toLowerCase()

    // TODO: make this a one-liner
    for (var index in searchStrings)
    {
        if (searchString.includes(searchStrings[index]))
        {
            return searchStrings[index]
        }
    }
    return null
}

// Our list of tests to be run on URLS
export const tests = [
    {
        phase: 'pre',
        skipUrl: true,
        name: "zeroLengthURL", // Skip checking this item if URL is zero length or null
        test: (input, options, response) => input.currentURL.length == 0,
        reason: (input, options, response) => "Empty URL"
    },
    {
        phase: 'pre',
        skipUrl: true,
        name: "anchorURL", // Skip checking this item if URL starts with hash/pound symbol (is an anchor within the page)
        test: (input, options, response) => input.currentURL[0] == "#",
        reason: (input, options, response) => "Anchor URL - skipped"
    },
    {
        phase: 'pre',
        skipUrl: true,
        name: "mailtoURL", // Skip checking this item if URL is a 'mailto' URL
        test: (input, options, response) => input.currentURL.startsWith("mailto"),
        reason: (input, options, response) => "mailto URL - skipped"
    },
    {
        phase: 'pre',
        skipUrl: true,
        name: "mailtoURL", // Skip checking this item if URL is a 'javascript' URL
        test: (input, options, response) => input.currentURL.startsWith("javascript"),
        reason: (input, options, response) => "javascript URL - skipped"
    },
    {
        phase: 'pre',
        name: "invalidURL", // Skip checking this item if no consistent URL listed (this means we couldn't parse the URL)
        test: (input, options, response) => !input.consistentURL,
        reason: (input, options, response) => "Invalid URL"
    },
    {
        phase: 'pre',
        name: "tooManyRedirects", // Fail if too many redirects have been made
        test: (input, options, response) => input.redirects && input.redirects.length > 5,
        reason: (input, options, response) => "Too many redirects"
    },
    {
        phase: 'pre',
        name: "invalidURL", // Fail this URL if the URL cannot be parsed
        test: (input, options, response) => 
        {
            try {
                let url = getURL(input)
            }
            catch (error) {
                return true
            }
        },
        reason: (input, options, response) => 
        {
            try {
                let url = getURL(input)
            }
            catch (error) {
                return "Error: " + error.message
            }
        }
    },
    {
        phase: 'pre',
        skipUrl: true,
        name: "skippedMimeType", // Skip checking this item if the mime type isn't something we check
        test: (input, options, response) => 
        {
            input.guessedContentType = GuessContentType(getURL(input));
            return !checkedMimeTypes.includes(input.guessedContentType)
        },
        reason: (input, options, response) => "Skipped due to mime-type '" + input.guessedContentType + "'"
    },
    { 
        phase: 'pre',
        skipUrl: true,
        name: "skippedHost", // Skip checking this item if the host is in the list of hosts to skip
        test: (input, options, response) => options.skippedHosts.includes(getURL(input).host),
        reason: (input, options, response) => input.reason = "Host on list to skip: " + getURL(input).host
    },
    {
        phase: 'post',
        statusCodes: [403],
        skipUrl: true,
        name: 'skipCloudflare', // Check if the response is CloudFlare blocking our request
        test: (input, options, response, responseText) => responseText.slice(0, 100).trim().startsWith("<!DOCTYPE html><html lang=\"en-US\"><head><title>Just a moment...</title>"),
        reason: (input, options, response) => "Unable to check - host protected by CloudFlare"
    },
    {
        phase: 'post',
        name: 'badHTTPCode', // Check if the response had a bad HTTP response code indicating an error
        test: (input, options, response) => ![200, 301, 302, 303, 304, 307, 308].includes(response.status),
        reason: (input, options, response) => "Bad HTTP status: " + response.status
    },
    {
        phase: 'post',
        statusCodes: [200, 304],
        name: 'responseSize', // Check this page isn't far too short
        test: (input, options, response) => response.headers["content-length"] < 500,
        reason: (input, options, response) => "Page improbably small: size was " + response.headers["content-length"]
    },
    {
        phase: 'post',
        statusCodes: [200, 304],
        name: 'expectedContentType', // Check content type is something expected
        test: (input, options, response) => 
            response.headers["Content-Type"] && 
            (response.headers["Content-Type"] != input.guessedContentType),
        reason: (input, options, response) =>
            "Page doesn't appear to have right type of content: " + 
            response.headers["Content-Type"] + 
            " vs " + 
            input.guessedContentType
    },
    {
        phase: 'post',
        contentTypes: ["text/html"],
        statusCodes: [200, 304],
        name: 'validHTML', // Check the response body looks like a valid HTML document
        test: (input, options, response, responseText) =>
            !responseText.slice(0, 100).trim().toLowerCase().startsWith("<!doctype html") && 
            !responseText.slice(0, 100).trim().toLowerCase().startsWith("<html") &&
            !responseText.slice(0, 100).trim().toLowerCase().startsWith("<!--") &&
            !responseText.slice(0, 100).trim().toLowerCase().startsWith("<?xml version=\"1.0\" encoding=\"utf-8\"?><!doctype html"),
        reason: (input, options, response, responseText) => "Does not look like a valid HTML file: first characters are '" + responseText.slice(0, 60).trim().toLowerCase() + "'"
    },
    {
        phase: 'post',
        contentTypes: ["application/pdf"],
        statusCodes: [200, 304],
        name: 'validPDF', // Check the response body looks like a valid PDF document
        test: (input, options, response, responseText) => !responseText.slice(0, 30).trim().toLowerCase().startsWith("%pdf-"),
        reason: (input, options, response, responseText) => "Does not look like a valid PDF file: first characters are " + responseText.slice(0, 30).trim()
    },
    {
        phase: 'post',
        contentTypes: ["text/html"],
        statusCodes: [200, 304],
        name: 'blacklistPhrase', // Check if this appears to be an error page based on the page text
        test: (input, options, response, responseText) => searchHtml(responseText, blacklist),
        reason: (input, options, response, responseText) => "HTML document contains phrase '" + searchHtml(responseText, blacklist) + "'"
    },
    {
        phase: 'post',
        statusCodes: [301, 302, 303, 307, 308],
        name: 'invalidRedirect', // Check for redirects that provide only a path starting with '/'
        test: (input, options, response) => response.url[0] == "/",
        reason: (input, options, response) => "Invalid path in redirect"
    },
    {
        phase: 'post',
        statusCodes: [301, 302, 303, 307, 308],
        name: 'invalidRedirect', // Check for redirects that redirect you to the root page of a server rather than a specific resource
        test: (input, options, response) => 
            (getURL(input)).pathname.length > 2 // path requested was not /
            && (new URL(response.headers.get("location"), input.currentURL)).pathname.length < 2, // but was redirected to /
        reason: (input, options, response) => "Redirected to root page " + (new URL(response.headers.get("location"), input.currentURL)).href
    },
]
