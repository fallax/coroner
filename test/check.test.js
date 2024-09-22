const check = require('../index.js');

const urls = [
  "https://genderkit.org.uk",
  "https://genderarchive.org.uk"
];

/// ************************
/// Test main URL check code
/// ************************

// Test that a URL which is current alive is seen as alive
test('alive URL works correctly', async () => {
  await expect(check("https://daringfireball.net")).resolves.toMatchObject(
    [{
      url: "https://daringfireball.net",
      "alive": true,
      "guessedContentType": "text/html",
      "consistentURL": "https://daringfireball.net/"
    }]
  );
});

// Test that a URL which redirects to an alive URL is seen as alive
test('redirect URL works correctly', async () => {
  await expect(check("https://www.daringfireball.net")).resolves.toMatchObject(
    [{
      url: "https://www.daringfireball.net",
      "alive": true,
      "redirect": true,
      "currentURL": "https://daringfireball.net/",
      "guessedContentType": "text/html"
    }]
  );
});

// Test that a URL which is currently a 404 page is seen as dead
test('error URL works correctly', async () => {
  await expect(check("https://daringfireball.net/error/errors")).resolves.toMatchObject(
    [{
      "url": "https://daringfireball.net/error/errors",
      "alive": false,
      "reason": "Bad HTTP status: 404",
      "guessedContentType": "text/html"
    }]
  );
});

test('404 works correctly x2', async () => {
  await expect(check("https://lgbt.foundation/comingout")).resolves.toMatchObject(
    [{
      url: "https://lgbt.foundation/comingout",
      "alive": false,
      "guessedContentType": "text/html"
    }]
  );
}, 10000);

test('404 works correctly x3', async () => {
  await expect(check("https://www.ocr.org.uk/students/replacement-certificates/gender-reassignment/")).resolves.toMatchObject(
    [{
      url: "https://www.ocr.org.uk/students/replacement-certificates/gender-reassignment/",
      "alive": false,
      "guessedContentType": "text/html"
    }]
  );
}, 10000);

// Test that a list of URLs is processed (not just a single URL)
test('list of URLS works correctly', async () => {
  await expect(check(urls)).resolves.toMatchObject(
    [
      {
        "url": "https://genderarchive.org.uk",
        "alive": true,
        "guessedContentType": "text/html"
      },
      {
        "alive": true,
        "url": "https://genderkit.org.uk",
        "guessedContentType": "text/html"
      }
    ]
  );
}, 10000);

// Test that multiple identical entries in a list return only one response
test('list of identical URLS is treated as one URL', async () => {
  await expect(check([
    "https://genderkit.org.uk",
    "https://genderarchive.org.uk",
    "https://genderkit.org.uk",
    "https://genderkit.org.uk"
  ], { timeout: 5000, cooldown: 1000 })).resolves.toMatchObject(
    [
      {
        "alive": true,
        "url": "https://genderarchive.org.uk",
        "guessedContentType": "text/html"
      },
      {
        "alive": true,
        "url": "https://genderkit.org.uk",
        "guessedContentType": "text/html"
      }
    ]
  );
});

// Test that multiple entries in a list which are effectively equivalent return only one response
test('list of equivalent URLS is treated as one URL', async () => {
  await expect(check([
    "https://genderkit.org.uk/",
    "https://genderkit.org.uk"
  ], { timeout: 5000, cooldown: 1000 })).resolves.toMatchObject(
    [
      {
        "alive": true,
        "url": "https://genderkit.org.uk/",
        consistentURL: 'https://genderkit.org.uk/',
        "guessedContentType": "text/html"
      }
    ]
  );
});

// TODO: should /index.html be treated the same as / ?

// Test that URLs with guessed mimetypes that should not be checked are skipped
test('ignored mimetypes are ignored', async () => {
  await expect(check([
    "https://test.com/js/test.js",
    "https://genderarchive.org.uk",
    "https://test.com/css/test.css?query=true",
    "https://genderkit.org.uk"
  ], { timeout: 5000, cooldown: 2500 })).resolves.toMatchObject(
    [
      {
        "alive": true,
        "url": "https://genderarchive.org.uk",
        "consistentURL": "https://genderarchive.org.uk/",
        "guessedContentType": "text/html"
      },
      {
        "alive": true,
        "url": "https://genderkit.org.uk",
        "consistentURL": "https://genderkit.org.uk/",
        "guessedContentType": "text/html"
      },
      {
        "alive": true,
        "skipped": true,
        "url": "https://test.com/css/test.css?query=true",
        "guessedContentType": "text/css"
      },
      {
        "alive": true,
        "skipped": true,
        "url": "https://test.com/js/test.js",
        "guessedContentType": "text/javascript"
      }
    ]
  );
});

// Test that different query strings are not treated as the same URL
test('URLs with different query strings are treated as different', async () => {
  await expect(check([
    "https://genderkit.org.uk",
    "https://genderkit.org.uk?query1",
    "https://genderkit.org.uk?query2"
  ], { timeout: 1000, cooldown: 1000 })).resolves.toMatchObject(
    [
      {
        "alive": true,
        "url": "https://genderkit.org.uk",
        "guessedContentType": "text/html"
      },
      {
        "alive": true,
        "url": "https://genderkit.org.uk?query1",
        "guessedContentType": "text/html"
      },
      {
        "alive": true,
        "url": "https://genderkit.org.uk?query2",
        "guessedContentType": "text/html"
      },
    ]
  );
});

// Check that URL that is supposed to be a PDF is detected as being not a PDF
test('PDF link is detected if not actually a pdf', async () => {
  await expect(check([
    "http://www.healthyshropshire.co.uk/assets/downloads/finaltrangenderguidancemarch2018.pdf"
  ])).resolves.toMatchObject(
    [
      {
        "alive": false,
        "guessedContentType": "application/pdf",
        "url": "http://www.healthyshropshire.co.uk/assets/downloads/finaltrangenderguidancemarch2018.pdf"
      }
    ]
  );
});

// Check that a page returning an HTTP 200 but which is clearly an error page is detected
test('HTTP 200 error page fails', async () => {
  await expect(check([
    "https://www.bucs.org.uk/core/core_picker/download.asp?id=31233",
    "https://phw.nhs.wales/services-and-teams/cervical-screening-wales/information-resources/information-leaflets-poster-downloads-and-accessible-information/screening-information-for-transgender-service-users/"
  ])).resolves.toMatchObject(
    [
      {
        "alive": false,
        "guessedContentType": "text/html",
        "url": "https://www.bucs.org.uk/core/core_picker/download.asp?id=31233",
        "reason": "HTML document contains phrase '404 not found'"
      },
      {
        "alive": false,
        "guessedContentType": "text/html",
        "url": "https://phw.nhs.wales/services-and-teams/cervical-screening-wales/information-resources/information-leaflets-poster-downloads-and-accessible-information/screening-information-for-transgender-service-users/",
        "reason": "HTML document contains phrase 'page not found'"
      }
    ]
  );
});

// Check that error page phrases are ignored in non-page content (e.g. Javascript code)
test('Blacklisted phrases are ignored in script tags', async () => {
  await expect(check([
    "https://www.rcpsych.ac.uk/improving-care/nccmh/service-design-and-development/advancing-mental-health-equity"
  ])).resolves.toMatchObject(
    [
      {
        "alive": true,
        "guessedContentType": "text/html",
        "url": "https://www.rcpsych.ac.uk/improving-care/nccmh/service-design-and-development/advancing-mental-health-equity",
      }
    ]
  );
});

// HTTP 308 redirects are handled correctly
// Check that redirects to relative paths are handled correctly
test('HTTP 308 redirect handled correctly', async () => {
  await expect(check([
    "https://igpm.org.uk/wp-content/uploads/2022/03/Gender-Identity-Toolkit-for-General-Practice.pdf"
  ])).resolves.toMatchObject(
    [
      {
        "alive": false,
        "guessedContentType": "application/pdf",
        "redirect": true,
        "url": "https://igpm.org.uk/wp-content/uploads/2022/03/Gender-Identity-Toolkit-for-General-Practice.pdf",
        "reason": 'Bad HTTP status: 404'
      }
    ]
  );
});

// HTTP 308 redirects are handled correctly
// Check that redirects to relative paths are handled correctly
test('HTTP 308 redirect handled correctly', async () => {
  await expect(check([
    "https://igpm.org.uk/wp-content/uploads/2022/03/Gender-Identity-Toolkit-for-General-Practice.pdf"
  ])).resolves.toMatchObject(
    [
      {
        "alive": false,
        "guessedContentType": "application/pdf",
        "redirect": true,
        "url": "https://igpm.org.uk/wp-content/uploads/2022/03/Gender-Identity-Toolkit-for-General-Practice.pdf",
        "reason": 'Bad HTTP status: 404'
      }
    ]
  );
});

// HTTP 403 handled correctly
test('HTTP 403 handled correctly', async () => {
  await expect(check([
    "http://pediatrics.aappublications.org/content/early/2016/02/24/peds.2015-3223.abstract"
  ])).resolves.toMatchObject(
    [
      {
        "alive": false,
        "guessedContentType": "text/html",
        "url": "http://pediatrics.aappublications.org/content/early/2016/02/24/peds.2015-3223.abstract",
        "reason": 'Bad HTTP status: 403'
      }
    ]
  );
});


// Check that redirects to relative paths are handled correctly
test('Redirect to relative path is handled correctly', async () => {
  await expect(check([
    "http://documents.manchester.ac.uk/display.aspx?DocID=12047"
  ])).resolves.toMatchObject(
    [
      {
        "alive": false,
        "guessedContentType": "text/html",
        "url": "http://documents.manchester.ac.uk/display.aspx?DocID=12047",
        "currentURL": "https://documents.manchester.ac.uk/doc_removed.aspx",
        "reason": 'Bad HTTP status: 404'
      }
    ]
  );
});

// Redirect to path starting with / is correctly handled

// Redirect to / of another server is detected properly as a dead link
test('Redirect to root is handled correctly', async () => {
  await expect(check([
    "https://www.brightonandhoveccg.nhs.uk/file/8726/download"
  ])).resolves.toMatchObject(
    [
      {
        "url": "https://www.brightonandhoveccg.nhs.uk/file/8726/download",
        "guessedContentType": "text/html",
        "alive": false,
        "reason": "Redirected to root page https://www.sussex.ics.nhs.uk/"
      }
    ]
  );
});

// Skip urls on hosts in host blacklist (e.g. fonts.google.com)
test('Redirect to root is handled correctly', async () => {
  await expect(check([
    "https://fonts.googleapis.com/css?family=Bree+Serif|Roboto+Condensed:700|Roboto:300,300i,700&display=swap"
  ],
    {
      skippedHosts: ["fonts.googleapis.com"]
    }
  )).resolves.toMatchObject(
    [
      {
        "url": "https://fonts.googleapis.com/css?family=Bree+Serif|Roboto+Condensed:700|Roboto:300,300i,700&display=swap",
        "guessedContentType": "text/html",
        "skipped": true,
        "alive": true,
        "reason": "Host on list to skip: fonts.googleapis.com"
      }
    ]
  );
});

// Redirect to same location as /verylongstring is detected as a dead link

// Skip relative URLs (starting with /)

// Pages that look like they are HTML but turn out to be a PDF are nicely handled
// eg. https://www.dpt.nhs.uk/download/Ote2T8sczT

// File size is improbably large for an HTML document

// File size is improbably small for a PDF

// Overridden mimetype is obeyed
// eg. https://www.lgbtyouth.org.uk/media/1344/supporting-transgender-young-people.pdf
