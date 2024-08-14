const { exit } = require('yargs');
const check = require('../index.js');

const urls = [
  "https://genderkit.org.uk",
  "https://walandablap.org.uk"
];
/*
  "https://twitter.com/LTTcancer",
  "https://www.nottsapc.nhs.uk/media/1209/transgender-prescribing-position-statement.pdf",
  "https://www.whatdotheyknow.com/request/879363/response/2101553/attach/3/Ref%20no%20FOI.2022.0423%20Response.pdf?cookie_passthrough=1",
  "https://www.nhsinform.scot/trans-screening",
  "https://www.nhsggc.org.uk/media/255885/nhsggc_equalities__changing_your_chi.pdf",
  "https://www.nottinghamshirehealthcare.nhs.uk/download.cfm?doc=docm93jijm4n9403.pdf&ver=16570",
  "https://view.officeapps.live.com/op/view.aspx?src=https%3A%2F%2Fwww.shsc.nhs.uk%2Fsites%2Fdefault%2Ffiles%2F2021-03%2FDraft%2520progesterone%2520guidelines.doc&wdOrigin=BROWSELINK",
  "https://view.officeapps.live.com/op/view.aspx?src=https%3A%2F%2Fwww.leedsandyorkpft.nhs.uk%2Four-services%2Fwp-content%2Fuploads%2Fsites%2F2%2F2021%2F05%2FHow-to-give-a-Testosterone-Intramuscular-IM-Injection.docx&wdOrigin=BROWSELINK",
  "https://cass.independent-review.uk/",
  "https://cass.independent-review.uk/wp-content/uploads/2022/03/Cass-Review-Interim-Report-Final-Web-Accessible.pdf",
  "https://cass.independent-review.uk/wp-content/uploads/2022/07/Cass-Review-Letter-to-NHSE_19-July-2022.pdf",
  "https://cavuhb.nhs.wales/our-services/welsh-gender-service/",
  "https://mermaidsuk.org.uk/wp-content/uploads/2022/04/Guide-for-service-users-obtaining-NHS-prescriptions.pdf",
  "https://goodlawproject.org/news/legal-advice-for-trans-children/?utm_source=Twitter&utm_campaign=TransSchoolsAdviceBlog160222&utm_medium=social%20media",
  "https://www.slatergordon.co.uk/newsroom/your-rights-when-transitioning-at-work/?utm_source=Social&utm_medium=Employment&utm_campaign=Transitioning",
  "https://web.archive.org/web/20220211132218/https://www.equalityhumanrights.com/en/our-work/news/response-misinformation-about-single-sex-spaces-guidance",
  "https://www.whatdotheyknow.com/request/668865/response/1594551/attach/8/Annex%20C%20161018%20Trans%20work%20update%20for%20Board.pdf?cookie_passthrough=1",
  "https://oestrogeneration.org/",
  "https://www.gires.org.uk/gires-projects/a-legacy-of-kindness-telling-the-story-of-gires/",
  "https://www.switchboard.org.uk/trans-survivors-zine/",
  "https://www.bma.org.uk/advice-and-support/gp-practices/gp-service-provision/managing-patients-with-gender-dysphoria",
  "https://lgbt.foundation/news/revealed-improving-trans-and-non-binary-experiences-of-maternity-services-items-report/475?__cf_chl_tk=hsvDm5RGSa4Uc30zE4t4WHlhMX4u3ix4bX6Jp89M7dI-1651134820-0-gaNycGzNB70",
  "https://igpm.org.uk/wp-content/uploads/2022/03/Gender-Identity-Toolkit-for-General-Practice.pdf",
  "https://gov.wales/sites/default/files/publications/2021-01/atisn14702doc5.pdf",
  "https://www.kclsu.org/news/article/6015/Trans-Healthcare-in-the-UK-What-It-Is-and-How-to-Access-It/",
  "https://www.lgbthero.org.uk/a-guide-to-trans-healthcare",
  "https://www.cqc.org.uk/guidance-providers/healthcare/adult-trans-care-pathway",
  "https://www.gov.uk/guidance/transgender-applications",
  "https://herefordshireandworcestershireccg.nhs.uk/policies/clinical-medicines-commissioning/clinical-policies-and-guidance/endocrine/103-non-core-grs-interventions-v1-0/file",
  "https://gov.wales/directed-enhanced-service-hormone-treatment-adult-patients-gender-dysphoria",
  "https://northerncanceralliance.nhs.uk/wp-content/uploads/2022/07/FINAL-Trans-non-binary-screen_leaflet.pdf",
  "https://www.bbc.co.uk/sounds/play/m0019b90",
  "https://www.gendergp.com/wp-content/uploads/2022/04/GMC-v-Dr-Helen-Webberley-determination-on-findings-of-fact.pdf",
  "https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/974817/Gender_recognition_V8.pdf",
  "https://www.bankofengland.co.uk/-/media/boe/files/freedom-of-information/2021/transitioning-at-work-policy.pdf",
  "https://www.hsib.org.uk/investigations-and-reports/provision-of-care-for-children-and-young-people-when-accessing-specialist-gender-dysphoria-services/provision-of-care-for-children-and-young-people-when-accessing-specialist-gender-dysphoria-services/",
  "https://www.england.nhs.uk/south/wp-content/uploads/sites/6/2022/03/Non-Surgical-Gender-Identity-Service-FINAL.pdf",
  "https://www.cps.gov.uk/cps/news/cps-seeks-publics-views-draft-deception-gender-legal-guidance",
  "https://coppafeel.org/info-resources/health-information/changes-during-transition/",
  "https://www.rcn.org.uk/magazines/Clinical/2022/Jul/Access-to-care-for-trans-and-non-binary-patients",
  "https://int.sussex.ics.nhs.uk/clinical_documents/management-of-transgender-non-binary-and-intersex-tnbi-adult-patients-in-primary-care-lcs/",
  "https://www.leeds.gov.uk/one-minute-guides/working-with-trans-young-people",
  "https://genderedintelligence.co.uk/zine/index.html",
  "http://yuf.org.uk/wp-content/uploads/2020/01/Gender-Identity-Guidance-MS-SC.pdf",
  "https://www.advicenow.org.uk/sites/default/files/1.GIDS%20Introduction%20Booklet_0.pdf"
];*/




test('alive URL works correctly', async () => {
  await expect(check("https://daringfireball.net")).resolves.toMatchObject(
    { url: "https://daringfireball.net", "alive": true }
  );
});

test('redirect URL works correctly', async () => {
  await expect(check("https://www.daringfireball.net")).resolves.toMatchObject(
    { url: "https://www.daringfireball.net", "alive": true }
  );
});

test('error URL works correctly', async () => {
  await expect(check("https://daringfireball.net/error/errors")).resolves.toMatchObject(
    { "url": "https://daringfireball.net/error/errors", "alive": false, "reason": "Bad HTTP status: 404" }
  );
});

// test('timeout URL works correctly', async () => {
//   await expect(check("https://gov.wales/sites/default/files/publications/2021-01/atisn14702doc5.pdf")).resolves.toMatchObject(
//     { url: "https://gov.wales/sites/default/files/publications/2021-01/atisn14702doc5.pdf", "alive": false }
//   );
// });

test('404 works correctly', async () => {
  await expect(check("https://lgbt.foundation/comingout")).resolves.toMatchObject(
    { url: "https://lgbt.foundation/comingout", "alive": false }
  );
}, 10000);

test('404 works correctly x2', async () => {
  await expect(check("https://www.ocr.org.uk/students/replacement-certificates/gender-reassignment/")).resolves.toMatchObject(
    { url: "https://www.ocr.org.uk/students/replacement-certificates/gender-reassignment/", "alive": false }
  );
}, 10000);

test('list of identical URLS is treated as one URL', async () => {
  await expect(check([
    "https://genderkit.org.uk",
    "https://google.com",
    "https://genderkit.org.uk",
    "https://genderkit.org.uk"
  ])).resolves.toMatchObject(
    [
      {
        "alive": true,
        "url": "https://genderkit.org.uk"
      },
      {
        "alive": true,
        "url": "https://google.com",
        "redirect": true,
        "redirectURL": "https://www.google.com"
      }
    ]
  );
});

test('list of URLS works correctly', async () => {
  await expect(check(urls)).resolves.toMatchObject(
    [{
      "alive": true,
      "url": "https://genderkit.org.uk",
    },
    {
      "url": "https://walandablap.org.uk"
    }
    ]
  );
});