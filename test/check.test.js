const check = require('../index.js');

const urls = [
  "https://genderkit.org.uk",
  "https://walandablap.org.uk"
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
      "redirectURL": "https://daringfireball.net/",
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

test('404 works correctly', async () => {
  await expect(check("https://lgbt.foundation/comingout")).resolves.toMatchObject(
    [{
      url: "https://lgbt.foundation/comingout",
      "alive": false,
      "guessedContentType": "text/html"
    }]
  );
}, 10000);

test('404 works correctly x2', async () => {
  await expect(check("https://www.ocr.org.uk/students/replacement-certificates/gender-reassignment/")).resolves.toMatchObject(
    [{
      url: "https://www.ocr.org.uk/students/replacement-certificates/gender-reassignment/",
      "alive": false,
      "guessedContentType": "text/html"
    }]
  );
}, 10000);

// test('timeout URL works correctly', async () => {
//   await expect(check("https://gov.wales/sites/default/files/publications/2021-01/atisn14702doc5.pdf")).resolves.toMatchObject(
//     { url: "https://gov.wales/sites/default/files/publications/2021-01/atisn14702doc5.pdf", "alive": false }
//   );
// });

// Test that a list of URLs is processed (not just a single URL)
test('list of URLS works correctly', async () => {
  await expect(check(urls)).resolves.toMatchObject(
    [{
      "alive": true,
      "url": "https://genderkit.org.uk",
      "guessedContentType": "text/html"
    },
    {
      "url": "https://walandablap.org.uk",
      "alive": true,
      "guessedContentType": "text/html"
    }
    ]
  );
}, 10000);

// Test that multiple identical entries in a list return only one response
test('list of identical URLS is treated as one URL', async () => {
  await expect(check([
    "https://genderkit.org.uk",
    "https://google.com",
    "https://genderkit.org.uk",
    "https://genderkit.org.uk"
  ], {timeout: 5000, cooldown: 1000})).resolves.toMatchObject(
    [
      {
        "alive": true,
        "url": "https://genderkit.org.uk",
        "guessedContentType": "text/html"
      },
      {
        "alive": true,
        "url": "https://google.com",
        "redirect": true,
        "redirectURL": "https://www.google.com/",
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
  ], {timeout: 5000, cooldown: 1000})).resolves.toMatchObject(
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
    "https://google.com",
    "https://test.com/css/test.css?query=true",
    "https://genderkit.org.uk"
  ], {timeout: 5000, cooldown: 2500})).resolves.toMatchObject(
    [
      {
        "alive": true,
        "url": "https://genderkit.org.uk",
        "guessedContentType": "text/html"
      }, 
      {
        "alive": true,
        "url": "https://google.com",
        "redirect": true,
        "redirectURL": "https://www.google.com/",
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
  ], {timeout: 1000})).resolves.toMatchObject(
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

// Redirect to / is detected properly as a dead link

// Redirect to same location as /verylongstring is detected as a dead link

// Skip relative URLs (starting with /)

// Skip urls on hosts in host blacklist (e.g. fonts.google.com)

// Other HTTP codes cause link to be detected as dead
// 403 'https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/974817/Gender_recognition_V8.pdf'

// HTTP 308 redirects are handled correctly - need to work out what to do with this!
// 308 'https://igpm.org.uk/wp-content/uploads/2022/03/Gender-Identity-Toolkit-for-General-Practice.pdf'

// Pages that say 'Page not found', etc, but are served 200 are treated as dead
// https://www.bucs.org.uk/core/core_picker/download.asp?id=31233
// https://phw.nhs.wales/services-and-teams/cervical-screening-wales/information-resources/information-leaflets-poster-downloads-and-accessible-information/screening-information-for-transgender-service-users/

// File size is improbably large for an HTML document

// File size is improbably small for a PDF

// Overridden mimetype is obeyed
// eg. https://www.lgbtyouth.org.uk/media/1344/supporting-transgender-young-people.pdf
// e.g. https://www.dpt.nhs.uk/download/Ote2T8sczT