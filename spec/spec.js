import { check } from '../index.js';

describe("A suite", function () {

    // Test that a URL which is current alive is seen as alive
    it('alive URL works correctly', async () => {
        expect(await (check("https://daringfireball.net"))).toEqual(
            [
                {
                    url: 'https://daringfireball.net',
                    consistentURL: 'https://daringfireball.net/',
                    guessedContentType: 'text/html',
                    currentURL: 'https://daringfireball.net',
                    alive: true
                }
            ]
        )
    }
    );

    // Test that a URL which is current alive is seen as alive
    it('invalid URL shown as broken', async () => {
        expect(await (check("https://2342%"))).toEqual(
            [
                {
                    url: "https://2342%",
                    currentURL: "https://2342%",
                    reason: 'Invalid URL',
                    consistentURL: null,
                    alive: false
                }
            ]
        )
    }
    );


    // Test that a URL which is current alive is seen as alive
    it('redirect URL works correctly', async () => {
        expect(await (check("https://www.daringfireball.net"))).toEqual(
            [
                {
                    url: "https://www.daringfireball.net",
                    currentURL: "https://daringfireball.net/",
                    consistentURL: "https://daringfireball.net/",
                    guessedContentType: 'text/html',
                    redirect: true,
                    redirects: ['https://www.daringfireball.net', 'https://daringfireball.net/'],
                    alive: true
                }
            ]
        )
    }
    );

    // Test that a URL which is current alive is seen as alive
    it('error URL works correctly', async () => {
        expect(await (check("https://daringfireball.net/error/errors"))).toEqual(
            [
                {
                    url: "https://daringfireball.net/error/errors",
                    currentURL: 'https://daringfireball.net/error/errors',
                    consistentURL: "https://daringfireball.net/error/errors",
                    alive: false,
                    reason: "Bad HTTP status: 404",
                    guessedContentType: "text/html"
                }
            ]
        )
    }
    );

    // Test that a list of URLs is processed (not just a single URL)
    it('list of URLS works correctly', async () => {
        expect(await (check(["https://genderarchive.org.uk", "https://genderkit.org.uk"]))).toEqual(
            [
                {
                    url: "https://genderarchive.org.uk",
                    alive: true,
                    guessedContentType: "text/html",
                    consistentURL: 'https://genderarchive.org.uk/',
                    currentURL: 'https://genderarchive.org.uk'
                },
                {
                    alive: true,
                    url: "https://genderkit.org.uk",
                    guessedContentType: "text/html",
                    consistentURL: 'https://genderkit.org.uk/',
                    currentURL: 'https://genderkit.org.uk'
                }
            ]
        )
    }
    );

    // Test that multiple identical entries in a list return only one response
    it('list of identical URLS is treated as one URL', async () => {
        expect(await (check([
            "https://genderkit.org.uk",
            "https://genderarchive.org.uk",
            "https://genderkit.org.uk",
            "https://genderkit.org.uk"
        ]))).toEqual(
            [
                {
                    url: "https://genderarchive.org.uk",
                    alive: true,
                    guessedContentType: "text/html",
                    consistentURL: 'https://genderarchive.org.uk/',
                    currentURL: 'https://genderarchive.org.uk'
                },
                {
                    alive: true,
                    url: "https://genderkit.org.uk",
                    guessedContentType: "text/html",
                    consistentURL: 'https://genderkit.org.uk/',
                    currentURL: 'https://genderkit.org.uk'
                }
            ]
        )
    }
    );

    // Test that multiple entries in a list which are effectively equivalent return only one response
    it('list of equivalent URLS is treated as one URL', async () => {
        expect(await (check([
            "https://genderkit.org.uk/",
            "https://genderkit.org.uk"
        ]))).toEqual(
            [
                {
                    alive: true,
                    url: "https://genderkit.org.uk/",
                    guessedContentType: "text/html",
                    consistentURL: 'https://genderkit.org.uk/',
                    currentURL: 'https://genderkit.org.uk/'
                }
            ]
        )
    }
    );


    // Test that URLs with guessed mimetypes that should not be checked are skipped
    it('ignored mimetypes are ignored', async () => {
        expect(await (check([
            "https://test.com/css/test.css?query=true",
            "https://genderkit.org.uk"
        ]))).toContain(
            {
                url: 'https://test.com/css/test.css?query=true',
                consistentURL: 'https://test.com/css/test.css?query=true',
                currentURL: 'https://test.com/css/test.css?query=true',
                guessedContentType: 'text/css',
                skipped: true,
                alive: true,
                reason: "Skipped due to mime-type 'text/css'"
            }
        )
    }
    );

    // Test that different query strings are not treated as the same URL
    it('URLs with different query strings are treated as different', async () => {
        expect((await (check([
            "https://genderkit.org.uk",
            "https://genderkit.org.uk?query1",
            "https://genderkit.org.uk?query2"
        ], { timeout: 1000, cooldown: 1000 })))).toContain(
            {
                alive: true,
                url: "https://genderkit.org.uk?query2",
                guessedContentType: "text/html",
                consistentURL: 'https://genderkit.org.uk/?query2',
                currentURL: 'https://genderkit.org.uk?query2',
            }
        )
    }
    );

    /*     // Test that PDF that does not look like a real pdf is detected as broken
        it('PDF link that does not appear to be a PDF is marked broken', async () => {
            expect((await (check([
                "http://www.healthyshropshire.co.uk/assets/downloads/finaltrangenderguidancemarch2018.pdf"
            ], { timeout: 1000, cooldown: 1000 })))).toEqual(
                [
                    {
                        alive: false,
                        guessedContentType: "application/pdf",
                        TODO: find a new broken PDF
                        url: "http://www.healthyshropshire.co.uk/assets/downloads/finaltrangenderguidancemarch2018.pdf",
                        consistentURL: 'http://healthyshropshire.co.uk/assets/downloads/finaltrangenderguidancemarch2018.pdf',
                        currentURL: 'http://www.healthyshropshire.co.uk/assets/downloads/finaltrangenderguidancemarch2018.pdf',
                        reason: 'Bad HTTP status: 404'
                    }
                    ]
            )
            }
        ); */

    // Check that error page phrases are ignored in non-page content (e.g. Javascript code)
    it('Blacklisted phrases are ignored in script tags', async () => {
        expect((await (check([
            "https://www.rcpsych.ac.uk/improving-care/nccmh/service-design-and-development/advancing-mental-health-equity"
        ], { timeout: 1000, cooldown: 1000 })))).toEqual(
            [
                {
                    alive: true,
                    guessedContentType: "text/html",
                    url: "https://www.rcpsych.ac.uk/improving-care/nccmh/service-design-and-development/advancing-mental-health-equity",
                    consistentURL: "https://rcpsych.ac.uk/improving-care/nccmh/service-design-and-development/advancing-mental-health-equity",
                    currentURL: "https://www.rcpsych.ac.uk/improving-care/nccmh/service-design-and-development/advancing-mental-health-equity",
                }
            ]
        )
    }
    );

    // HTTP 403 handled correctly
    it('HTTP 403 is handled correctly', async () => {
        expect((await (check([
            "http://pediatrics.aappublications.org/content/early/2016/02/24/peds.2015-3223.abstract"
        ])))).toEqual(
            [
                {
                    alive: false,
                    reason: 'Bad HTTP status: 403',
                    guessedContentType: "text/html",
                    url: "http://pediatrics.aappublications.org/content/early/2016/02/24/peds.2015-3223.abstract",
                    consistentURL: "http://pediatrics.aappublications.org/content/early/2016/02/24/peds.2015-3223.abstract",
                    currentURL: "http://pediatrics.aappublications.org/content/early/2016/02/24/peds.2015-3223.abstract",
                }
            ]
        )
    }
    );

    // Check that redirects to relative paths are handled correctly
    it('Relative path redirects handled correctly', async () => {
        expect((await (check([
            "http://documents.manchester.ac.uk/display.aspx?DocID=12047"
        ])))).toEqual(
            [
                {
                    alive: false,
                    guessedContentType: "text/html",
                    url: "http://documents.manchester.ac.uk/display.aspx?DocID=12047",
                    consistentURL: "http://documents.manchester.ac.uk/display.aspx?DocID=12047",
                    currentURL: "https://documents.manchester.ac.uk/doc_removed.aspx",
                    reason: 'Bad HTTP status: 404',
                    redirect: true,
                    redirects: ['http://documents.manchester.ac.uk/display.aspx?DocID=12047', 'https://documents.manchester.ac.uk/display.aspx?DocID=12047', 'https://documents.manchester.ac.uk/doc_removed.aspx']
                }
            ]
        )
    }
    );

    // Redirect to / of another server is detected properly as a dead link
    it('Redirect to root on another server handled correctly', async () => {
        expect((await (check([
            "https://www.brightonandhoveccg.nhs.uk/file/8726/download"
        ])))).toEqual(
            [
                {
                    alive: false,
                    guessedContentType: "text/html",
                    url: "https://www.brightonandhoveccg.nhs.uk/file/8726/download",
                    consistentURL: "https://brightonandhoveccg.nhs.uk/file/8726/download",
                    currentURL: "https://www.brightonandhoveccg.nhs.uk/file/8726/download",
                    reason: "Redirected to root page https://www.sussex.ics.nhs.uk/"
                }
            ]
        )
    }
    );

    // Hosts in blacklist are skipped
    it('Blacklisted hosts are skipped', async () => {
        expect((await (check([
            "https://fonts.googleapis.com/css?family=Bree+Serif|Roboto+Condensed:700|Roboto:300,300i,700&display=swap"
        ], {
            skippedHosts: ["fonts.googleapis.com"]
        })))).toEqual(
            [
                {
                    alive: true,
                    "skipped": true,
                    "reason": "Host on list to skip: fonts.googleapis.com",
                    guessedContentType: "text/html",
                    url: "https://fonts.googleapis.com/css?family=Bree+Serif|Roboto+Condensed:700|Roboto:300,300i,700&display=swap",
                    consistentURL: "https://fonts.googleapis.com/css?family=Bree+Serif|Roboto+Condensed:700|Roboto:300,300i,700&display=swap",
                    currentURL: "https://fonts.googleapis.com/css?family=Bree+Serif|Roboto+Condensed:700|Roboto:300,300i,700&display=swap"
                }
            ]
        )
    }
    );

    // Redirect to same location as /verylongstring is detected as a dead link

    // Skip relative URLs (starting with /)

    // Pages that look like they are HTML but turn out to be a PDF are nicely handled
    // eg. https://www.dpt.nhs.uk/download/Ote2T8sczT

    // File size is improbably large for an HTML document

    // File size is improbably small for a PDF

    // Overridden mimetype is obeyed
    // eg. https://www.lgbtyouth.org.uk/media/1344/supporting-transgender-young-people.pdf


});